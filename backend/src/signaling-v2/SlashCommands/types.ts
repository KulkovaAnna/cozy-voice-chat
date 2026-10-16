/** Результат выполнения слэш-команды */
export interface SlashCommandResult {
  /** Текст ответа (поддерживаются <br> для переноса строк) */
  text: string;
}

/** Обработчик слэш-команды */
export type CommandHandler = (
  args: string,
  senderId: string,
) => SlashCommandResult | Promise<SlashCommandResult>;

/** Описание зарегистрированной команды */
export interface SlashCommand {
  /** Название команды без слэша (например, 'help') */
  name: string;
  /** Краткое описание команды */
  description: string;
  /** Обработчик команды */
  handler: CommandHandler;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
