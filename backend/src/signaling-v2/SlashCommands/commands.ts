import { SlashCommand } from './types';

export const COMMANDS: SlashCommand[] = [
  {
    name: 'help',
    description: 'Показать список доступных команд',
    handler: () => ({
      text: `Доступные команды:${COMMANDS.map((c) => `\n• /${c.name} — ${c.description}`)}`,
    }),
  },
];
