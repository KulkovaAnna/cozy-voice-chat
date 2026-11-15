import { describe, it, expect, beforeEach } from 'vitest';

import musicPlayerService, {
  MAX_QUEUE_SIZE,
  MusicPlayerService,
} from '../../src/app/modules/music-player/music-player.service';
import type { MusicTrack } from '../../src/app/modules/music-player/music-player.types';

const TEST_CALL_ID = 'call-1';

describe('MusicPlayerService', () => {
  let player: MusicPlayerService;

  beforeEach(() => {
    musicPlayerService.destroy(TEST_CALL_ID);
    player = musicPlayerService.forCall(TEST_CALL_ID);
  });

  // ─── startQueue ──────────────────────────────────────────────
  describe('startQueue', () => {
    it('should set paused state with the first track', () => {
      const tracks: MusicTrack[] = [
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
      ];

      const ok = player.startQueue(tracks, 0);

      expect(ok).toBe(true);
      expect(player.status).toBe('paused');
      expect(player.queueIndex).toBe(0);
      expect(player.track!.url).toBe('https://y/1');
      expect(player.streamUrl).toBe(
        `/music/stream?callId=${TEST_CALL_ID}`,
      );
    });

    it('should accept a startIndex and clamp it', () => {
      const tracks: MusicTrack[] = [
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
        { url: 'https://y/3', title: 'Three' },
      ];

      player.startQueue(tracks, 2);

      expect(player.queueIndex).toBe(2);
      expect(player.track!.title).toBe('Three');
    });

    it('should clamp startIndex to zero when negative', () => {
      const tracks: MusicTrack[] = [{ url: 'https://y/1', title: 'One' }];
      player.startQueue(tracks, -5);
      expect(player.queueIndex).toBe(0);
    });

    it('should clamp startIndex to last item when too large', () => {
      const tracks: MusicTrack[] = [
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
      ];
      player.startQueue(tracks, 10);
      expect(player.queueIndex).toBe(1);
    });

    it('should return false for empty tracks', () => {
      expect(player.startQueue([])).toBe(false);
      expect(player.status).toBe('idle');
    });

    it('should filter out tracks without url', () => {
      player.startQueue([
        { url: 'https://y/1', title: 'One' },
        { title: 'NoUrl' },
        { url: '', title: 'EmptyUrl' },
        { url: 'https://y/2', title: 'Two' },
      ]);

      expect(player.queue).toHaveLength(2);
      expect(player.queueIndex).toBe(0);
    });

    it('should truncate titles to MAX_QUEUE_TITLE_LENGTH', () => {
      const longTitle = 'X'.repeat(200);
      player.startQueue([{ url: 'https://y/1', title: longTitle }]);
      expect(player.track!.title.length).toBe(120);
    });

    it('should truncate queue to MAX_QUEUE_SIZE', () => {
      const tracks: MusicTrack[] = Array.from({ length: 70 }, (_, i) => ({
        url: `https://y/${i}`,
        title: `Track ${i}`,
      }));

      player.startQueue(tracks, 0);
      expect(player.queue.length).toBe(MAX_QUEUE_SIZE);
    });

    it('should return a deep copy of the state', () => {
      player.startQueue([{ url: 'https://y/1', title: 'One' }]);
      const state1 = player.state;
      state1.queue.push({ url: 'https://y/X', title: 'Fake' });
      expect(player.queue.length).toBe(1);
    });

    it('should clear directUrl cache on start', () => {
      player.startQueue([{ url: 'https://y/1', title: 'One' }]);
      player.setDirectUrlFor(0, 'http://old-url');
      player.startQueue([{ url: 'https://y/2', title: 'Two' }]);
      expect(player.directUrlFor(0)).toBeNull();
    });
  });

  // ─── startTrack ──────────────────────────────────────────────
  describe('startTrack', () => {
    it('should wrap a single track in queue', () => {
      player.startTrack({
        url: 'https://y/1',
        title: 'Single',
        directUrl: 'http://stream',
      });

      expect(player.queue).toHaveLength(1);
      expect(player.queueIndex).toBe(0);
      expect(player.directUrl).toBe('http://stream');
    });

    it('should work without directUrl', () => {
      player.startTrack({ url: 'https://y/1', title: 'Single' });
      expect(player.directUrl).toBeNull();
    });
  });

  // ─── next / prev ─────────────────────────────────────────────
  describe('next', () => {
    it('should move to the next track', () => {
      player.startQueue([
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
        { url: 'https://y/3', title: 'Three' },
      ]);

      const next = player.next();
      expect(next!.title).toBe('Two');
      expect(player.queueIndex).toBe(1);
    });

    it('should stop the player after the last track', () => {
      player.startQueue([
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
      ]);

      player.next();
      player.next();

      expect(player.status).toBe('idle');
      expect(player.queue).toEqual([]);
    });

    it('should return null when idle', () => {
      expect(player.next()).toBeNull();
    });
  });

  describe('prev', () => {
    it('should move to the previous track', () => {
      player.startQueue([
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
      ]);
      player.next();

      const prev = player.prev();
      expect(prev!.title).toBe('One');
      expect(player.queueIndex).toBe(0);
    });

    it('should return null when on the first track', () => {
      player.startQueue([
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
      ]);

      expect(player.prev()).toBeNull();
      expect(player.queueIndex).toBe(0);
    });
  });

  // ─── jumpTo ──────────────────────────────────────────────────
  describe('jumpTo', () => {
    it('should jump to a valid index', () => {
      player.startQueue([
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
        { url: 'https://y/3', title: 'Three' },
      ]);

      const track = player.jumpTo(2);
      expect(track!.title).toBe('Three');
      expect(player.queueIndex).toBe(2);
    });

    it('should return null for out-of-bounds index', () => {
      player.startQueue([{ url: 'https://y/1', title: 'One' }]);
      expect(player.jumpTo(5)).toBeNull();
      expect(player.jumpTo(-1)).toBeNull();
    });
  });

  // ─── directUrl cache ─────────────────────────────────────────
  describe('directUrl cache', () => {
    it('should cache directUrl by queue index', () => {
      player.startQueue([
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
      ]);

      player.setDirectUrlFor(0, 'http://stream-1');
      player.setDirectUrlFor(1, 'http://stream-2');

      expect(player.directUrlFor(0)).toBe('http://stream-1');
      expect(player.directUrlFor(1)).toBe('http://stream-2');
      expect(player.directUrl).toBe('http://stream-1');
    });

    it('should allow setting directUrl for current queueIndex', () => {
      player.startQueue([{ url: 'https://y/1', title: 'One' }]);
      player.setDirectUrl('http://stream');
      expect(player.directUrl).toBe('http://stream');
    });

    it('should clear directUrl when set to null', () => {
      player.startQueue([{ url: 'https://y/1', title: 'One' }]);
      player.setDirectUrlFor(0, 'http://stream');
      player.setDirectUrlFor(0, null);
      expect(player.directUrlFor(0)).toBeNull();
    });
  });

  // ─── stop ────────────────────────────────────────────────────
  describe('stop', () => {
    it('should reset everything to idle', () => {
      player.startQueue([
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
      ]);
      player.setDirectUrlFor(0, 'http://stream');
      player.setStatus('playing');
      player.stop();

      expect(player.status).toBe('idle');
      expect(player.queue).toEqual([]);
      expect(player.queueIndex).toBe(-1);
      expect(player.track).toBeNull();
      expect(player.directUrl).toBeNull();
      expect(player.isPlaying()).toBe(false);
    });
  });

  // ─── isPlaying ───────────────────────────────────────────────
  describe('isPlaying', () => {
    it('should return true for playing and paused', () => {
      player.startQueue([{ url: 'https://y/1', title: 'One' }]);
      expect(player.isPlaying()).toBe(true);
      player.setStatus('playing');
      expect(player.isPlaying()).toBe(true);
    });

    it('should return false after stop', () => {
      player.stop();
      expect(player.isPlaying()).toBe(false);
    });
  });

  // ─── изоляция по звонкам ─────────────────────────────────────
  describe('registry', () => {
    it('should keep queues of different calls independent', () => {
      const second = musicPlayerService.forCall('call-2');

      player.startQueue([{ url: 'https://y/1', title: 'First room' }]);
      second.startQueue([{ url: 'https://y/2', title: 'Second room' }]);

      expect(player.track!.url).toBe('https://y/1');
      expect(second.track!.url).toBe('https://y/2');
      expect(player.streamUrl).toBe('/music/stream?callId=call-1');
      expect(second.streamUrl).toBe('/music/stream?callId=call-2');

      player.stop();

      expect(player.isPlaying()).toBe(false);
      expect(second.isPlaying()).toBe(true);

      musicPlayerService.destroy('call-2');
    });

    it('should destroy only the requested player', () => {
      const second = musicPlayerService.forCall('call-2');
      player.startQueue([{ url: 'https://y/1', title: 'First room' }]);
      second.startQueue([{ url: 'https://y/2', title: 'Second room' }]);

      musicPlayerService.destroy(TEST_CALL_ID);

      expect(musicPlayerService.get(TEST_CALL_ID)).toBeUndefined();
      expect(musicPlayerService.get('call-2')).toBe(second);
      expect(second.isPlaying()).toBe(true);

      musicPlayerService.destroy('call-2');
    });
  });
});
