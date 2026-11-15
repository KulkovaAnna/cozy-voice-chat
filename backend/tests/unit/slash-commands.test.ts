import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlashCommandRegistry } from '../../src/signaling-v2/SlashCommands';

describe('SlashCommandRegistry', () => {
  let registry: SlashCommandRegistry;

  beforeEach(() => {
    registry = new SlashCommandRegistry();
  });

  // ─── constructor ──────────────────────────────────────────────
  describe('constructor', () => {
    it('should register /help by default', () => {
      const commands = registry.list();
      const help = commands.find((c) => c.name === 'help');
      expect(help).toBeDefined();
      expect(help?.description).toBe('Показать список доступных команд');
    });
  });

  // ─── register ─────────────────────────────────────────────────
  describe('register', () => {
    it('should register a new command', () => {
      registry.register({
        name: 'ping',
        description: 'Проверить доступность бота',
        handler: () => ({ text: 'pong' }),
      });

      const commands = registry.list();
      // help + play (из COMMANDS) + ping = 3
      expect(commands).toHaveLength(3);
      expect(commands.find((c) => c.name === 'ping')).toBeDefined();
    });

    it('should allow overwriting an existing command', () => {
      registry.register({
        name: 'help',
        description: 'Переопределённая справка',
        handler: () => ({ text: 'custom' }),
      });

      const commands = registry.list();
      const help = commands.find((c) => c.name === 'help');
      expect(help?.description).toBe('Переопределённая справка');
    });
  });

  // ─── execute ──────────────────────────────────────────────────
  describe('execute', () => {
    it('should call the handler and return result', async () => {
      registry.register({
        name: 'ping',
        description: 'Проверить доступность бота',
        handler: () => ({ text: 'pong' }),
      });

      const result = await registry.execute('ping', '', 'user-1', 'call-1');
      expect(result).toEqual({ text: 'pong' });
    });

    it('should pass args, senderId, callId and progress reporter to the handler', async () => {
      const handler = vi.fn(() => ({ text: 'ok' }));

      registry.register({
        name: 'greet',
        description: 'Приветствие',
        handler,
      });

      await registry.execute('greet', 'World', 'user-42', 'call-42');
      expect(handler).toHaveBeenCalledWith(
        'World',
        'user-42',
        'call-42',
        expect.any(Function),
      );
    });

    it('should forward progress reports from the handler', async () => {
      const handler = vi.fn(
        async (
          _args: string,
          _id: string,
          _callId: string,
          report: (t: string) => void,
        ) => {
          report('stage 1');
          report('stage 2');
          return { text: 'ok' };
        },
      );

      registry.register({
        name: 'staged',
        description: 'Команда со стадиями',
        handler,
      });

      const reports: string[] = [];
      await registry.execute('staged', '', 'user-1', 'call-1', (text) =>
        reports.push(text),
      );

      expect(reports).toEqual(['stage 1', 'stage 2']);
    });

    it('should not fail when handler reports without a subscriber', async () => {
      const handler = vi.fn(
        async (
          _args: string,
          _id: string,
          _callId: string,
          report: (t: string) => void,
        ) => {
          report('stage 1');
          return { text: 'ok' };
        },
      );

      registry.register({ name: 'quiet', description: 'Тест', handler });

      const result = await registry.execute('quiet', '', 'user-1', 'call-1');
      expect(result).toEqual({ text: 'ok' });
    });

    it('should be case-insensitive', async () => {
      registry.register({
        name: 'PING',
        description: 'Тест',
        handler: () => ({ text: 'pong' }),
      });

      const result = await registry.execute('ping', '', 'u', 'call-1');
      expect(result).toEqual({ text: 'pong' });

      const result2 = await registry.execute('PING', '', 'u', 'call-1');
      expect(result2).toEqual({ text: 'pong' });

      const result3 = await registry.execute('Ping', '', 'u', 'call-1');
      expect(result3).toEqual({ text: 'pong' });
    });

    it('should return null for unknown command', async () => {
      const result = await registry.execute('unknown', '', 'user-1', 'call-1');
      expect(result).toBeNull();
    });

    it('should return promise (async handler)', async () => {
      registry.register({
        name: 'slow',
        description: 'Медленная команда',
        handler: async () => {
          await new Promise((r) => setTimeout(r, 10));
          return { text: 'done' };
        },
      });

      const result = await registry.execute('slow', '', 'u', 'call-1');
      expect(result).toEqual({ text: 'done' });
    });
  });

  // ─── list ─────────────────────────────────────────────────────
  describe('list', () => {
    it('should return all registered commands', () => {
      const initial = registry.list().length;

      registry.register({
        name: 'cmd1',
        description: '1',
        handler: () => ({ text: '' }),
      });
      registry.register({
        name: 'cmd2',
        description: '2',
        handler: () => ({ text: '' }),
      });

      const commands = registry.list();
      expect(commands).toHaveLength(initial + 2);
      expect(commands.find((c) => c.name === 'cmd1')).toBeDefined();
      expect(commands.find((c) => c.name === 'cmd2')).toBeDefined();
    });
  });

  // ─── search ───────────────────────────────────────────────────
  describe('search', () => {
    beforeEach(() => {
      registry.register({
        name: 'ping',
        description: 'Проверить доступность бота',
        handler: () => ({ text: 'pong' }),
      });
      registry.register({
        name: 'status',
        description: 'Проверить статус системы',
        handler: () => ({ text: 'ok' }),
      });
      registry.register({
        name: 'debug-info',
        description: 'Показать отладочную информацию',
        handler: () => ({ text: 'debug' }),
      });
    });

    it('should return all commands when query is empty', () => {
      // help + play (из COMMANDS) + ping + status + debug-info = 5
      const result = registry.search('', 1, 10);
      expect(result.items).toHaveLength(5);
      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by name', () => {
      const result = registry.search('ping', 1, 10);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('ping');
      expect(result.total).toBe(1);
    });

    it('should filter by description', () => {
      const result = registry.search('статус', 1, 10);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('status');
      expect(result.total).toBe(1);
    });

    it('should be case-insensitive', () => {
      const result = registry.search('PING', 1, 10);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('ping');
    });

    it('should support partial match', () => {
      const result = registry.search('debug', 1, 10);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('debug-info');
    });

    it('should return empty when no match', () => {
      const result = registry.search('xyz', 1, 10);
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should paginate results', () => {
      // help + play + ping + status + debug-info = 5
      const result1 = registry.search('', 1, 2);
      expect(result1.items).toHaveLength(2);
      expect(result1.total).toBe(5);
      expect(result1.page).toBe(1);
      expect(result1.limit).toBe(2);

      const result2 = registry.search('', 2, 2);
      expect(result2.items).toHaveLength(2);
      expect(result2.page).toBe(2);
    });

    it('should combine search with pagination', () => {
      // 'd' находит: play (в описании "SoundCloud") и debug-info (в имени)
      const result = registry.search('d', 1, 1);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(2);
      expect(result.items[0].name).toBe('play');
    });
  });
});
