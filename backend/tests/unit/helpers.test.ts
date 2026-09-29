import { describe, it, expect, vi } from 'vitest';
import Helpers from '../../src/utils/helpers';

describe('Helpers', () => {
  // ─── validateIP ───────────────────────────────────────────────
  describe('validateIP', () => {
    it('should return true for valid IPv4 addresses', () => {
      expect(Helpers.validateIP('192.168.1.1')).toBe(true);
      expect(Helpers.validateIP('10.0.0.1')).toBe(true);
      expect(Helpers.validateIP('255.255.255.255')).toBe(true);
      expect(Helpers.validateIP('0.0.0.0')).toBe(true);
    });

    it('should return false for invalid IP format', () => {
      expect(Helpers.validateIP('')).toBe(false);
      expect(Helpers.validateIP('abc')).toBe(false);
      expect(Helpers.validateIP('1.2.3')).toBe(false);
      expect(Helpers.validateIP('1.2.3.4.5')).toBe(false);
      expect(Helpers.validateIP('1.2.3.4/24')).toBe(false);
    });

    it('should return false for out-of-range octets', () => {
      expect(Helpers.validateIP('256.1.1.1')).toBe(false);
      expect(Helpers.validateIP('1.256.1.1')).toBe(false);
      expect(Helpers.validateIP('1.1.1.999')).toBe(false);
      expect(Helpers.validateIP('-1.0.0.0')).toBe(false);
    });

    it('should return false for non-numeric parts', () => {
      expect(Helpers.validateIP('192.168.abc.1')).toBe(false);
      expect(Helpers.validateIP('192.168.1.')).toBe(false);
    });
  });

  // ─── generateRoomCode ─────────────────────────────────────────
  describe('generateRoomCode', () => {
    it('should return a string of length 6', () => {
      const code = Helpers.generateRoomCode();
      expect(code).toHaveLength(6);
    });

    it('should contain only uppercase letters and digits', () => {
      for (let i = 0; i < 50; i++) {
        const code = Helpers.generateRoomCode();
        expect(code).toMatch(/^[A-Z0-9]+$/);
      }
    });

    it('should produce different values (probabilistic)', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 20; i++) {
        codes.add(Helpers.generateRoomCode());
      }
      // С вероятностью ~1 набор из 20 будет уникальным
      expect(codes.size).toBeGreaterThan(1);
    });
  });

  // ─── generateRoomId ───────────────────────────────────────────
  describe('generateRoomId', () => {
    it('should return a string of length 6', () => {
      expect(Helpers.generateRoomId()).toHaveLength(6);
    });

    it('should contain only uppercase letters and digits', () => {
      for (let i = 0; i < 50; i++) {
        expect(Helpers.generateRoomId()).toMatch(/^[A-Z0-9]+$/);
      }
    });
  });

  // ─── omitDeep ─────────────────────────────────────────────────
  describe('omitDeep', () => {
    it('should remove top-level keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = Helpers.omitDeep(obj, ['b']);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should remove nested keys', () => {
      const obj = {
        a: 1,
        nested: { b: 2, ws: 'remove', c: 3 },
      };
      const result = Helpers.omitDeep(obj, ['ws']);
      expect(result).toEqual({ a: 1, nested: { b: 2, c: 3 } });
    });

    it('should handle arrays of objects', () => {
      const obj = {
        items: [
          { id: 1, ws: 'drop' },
          { id: 2, ws: 'drop' },
        ],
      };
      const result = Helpers.omitDeep(obj, ['ws']);
      expect(result).toEqual({
        items: [{ id: 1 }, { id: 2 }],
      });
    });

    it('should handle deeply nested objects', () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              ws: 'remove',
              keep: 'yes',
            },
          },
        },
      };
      const result = Helpers.omitDeep(obj, ['ws']);
      expect(result).toEqual({
        level1: { level2: { level3: { keep: 'yes' } } },
      });
    });

    it('should return primitives unchanged', () => {
      expect(Helpers.omitDeep(42, ['a'])).toBe(42);
      expect(Helpers.omitDeep('hello', ['a'])).toBe('hello');
      expect(Helpers.omitDeep(null, ['a'])).toBeNull();
      expect(Helpers.omitDeep(true, ['a'])).toBe(true);
    });

    it('should preserve Date objects', () => {
      const date = new Date();
      const obj = { date, ws: 'remove' };
      const result = Helpers.omitDeep(obj, ['ws']);
      expect(result.date).toBeInstanceOf(Date);
      expect(result.date.getTime()).toBe(date.getTime());
    });

    it('should preserve RegExp objects', () => {
      const regex = /test/g;
      const obj = { regex, ws: 'remove' };
      const result = Helpers.omitDeep(obj, ['ws']);
      expect(result.regex).toBeInstanceOf(RegExp);
      expect(result.regex.source).toBe('test');
    });

    it('should not modify the original object', () => {
      const obj = { a: 1, ws: 'drop', nested: { ws: 'drop', b: 2 } };
      const original = JSON.parse(JSON.stringify(obj));
      Helpers.omitDeep(obj, ['ws']);
      expect(obj).toEqual(original);
    });

    it('should handle empty keysToOmit array', () => {
      const obj = { a: 1, b: { c: 2 } };
      const result = Helpers.omitDeep(obj, []);
      expect(result).toEqual({ a: 1, b: { c: 2 } });
    });

    it('should handle multiple keys to omit', () => {
      const obj = { a: 1, b: 2, c: 3, d: { a: 4, e: 5 } };
      const result = Helpers.omitDeep(obj, ['a', 'b']);
      expect(result).toEqual({ c: 3, d: { e: 5 } });
    });

    it('should handle array at top level', () => {
      const arr = [{ ws: 'drop', x: 1 }, { ws: 'drop', y: 2 }];
      const result = Helpers.omitDeep(arr, ['ws']);
      expect(result).toEqual([{ x: 1 }, { y: 2 }]);
    });
  });

  // ─── getLocalIP ───────────────────────────────────────────────
  describe('getLocalIP', () => {
    it('should return an array of strings', () => {
      const ips = Helpers.getLocalIP();
      expect(Array.isArray(ips)).toBe(true);
      ips.forEach((ip) => expect(typeof ip).toBe('string'));
    });

    it('should contain only valid IPv4 addresses', () => {
      const ips = Helpers.getLocalIP();
      ips.forEach((ip) => {
        expect(Helpers.validateIP(ip)).toBe(true);
      });
    });

    it('should not include loopback (127.x.x.x)', () => {
      const ips = Helpers.getLocalIP();
      ips.forEach((ip) => {
        expect(ip.startsWith('127.')).toBe(false);
      });
    });
  });
});
