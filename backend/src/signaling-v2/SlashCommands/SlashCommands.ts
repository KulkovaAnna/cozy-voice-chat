import { COMMANDS } from './commands';
import { PaginatedResult, SlashCommand, SlashCommandResult } from './types';

export class SlashCommandRegistry {
  private commands = new Map<string, SlashCommand>();

  constructor() {
    COMMANDS.forEach((cmd) => this.register(cmd));
  }

  /** Зарегистрировать команду */
  register(command: SlashCommand): void {
    this.commands.set(command.name.toLowerCase(), command);
  }

  /** Выполнить команду. Возвращает результат или null, если команда не найдена */
  async execute(
    command: string,
    args: string,
    senderId: string,
  ): Promise<SlashCommandResult | null> {
    const name = command.toLowerCase();
    const cmd = this.commands.get(name);
    if (!cmd) {
      return null;
    }
    return cmd.handler(args, senderId);
  }

  /** Получить список всех команд */
  list(): SlashCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Поиск команд с фильтром по подстроке и пагинацией.
   * @param query — подстрока для поиска по name и description
   * @param page — номер страницы (с 1)
   * @param limit — элементов на странице
   */
  search(
    query: string,
    page: number,
    limit: number,
  ): PaginatedResult<Pick<SlashCommand, 'name' | 'description'>> {
    const all = this.list();
    const q = query.trim().toLowerCase();

    const filtered = q
      ? all.filter(
          (cmd) =>
            cmd.name.toLowerCase().includes(q) ||
            cmd.description.toLowerCase().includes(q),
        )
      : all;

    const total = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered
      .slice(start, start + limit)
      .map(({ name, description }) => ({ name, description }));

    return { items, total, page, limit };
  }
}
