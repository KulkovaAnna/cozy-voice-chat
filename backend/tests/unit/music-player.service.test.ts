import { describe, it, expect, beforeEach, vi } from 'vitest';

import musicPlayerService, {
  MAX_QUEUE_SIZE,
} from '../../src/app/modules/music-player/music-player.service';
import type { MusicTrack } from '../../src/app/modules/music-player/music-player.types';

describe('MusicPlayerService', () => {
  beforeEach(() => {
    musicPlayerService.stop();
  });

  // ─── startQueue ──────────────────────────────────────────────
  describe('startQueue', () => {
    it('should set paused state with the first track', () => {
      const tracks: MusicTrack[] = [
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
      ];

      const ok = musicPlayerService.startQueue(tracks, 0);

      expect(ok).toBe(true);
      expect(musicPlayerService.status).toBe('paused');
      expect(musicPlayerService.queueIndex).toBe(0);
      expect(musicPlayerService.track!.url).toBe('https://y/1');
      expect(musicPlayerService.streamUrl).toBe('/music/stream');
    });

    it('should accept a startIndex and clamp it', () => {
      const tracks: MusicTrack[] = [
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
        { url: 'https://y/3', title: 'Three' },
      ];

      musicPlayerService.startQueue(tracks, 2);

      expect(musicPlayerService.queueIndex).toBe(2);
      expect(musicPlayerService.track!.title).toBe('Three');
    });

    it('should clamp startIndex to zero when negative', () => {
      const tracks: MusicTrack[] = [{ url: 'https://y/1', title: 'One' }];
      musicPlayerService.startQueue(tracks, -5);
      expect(musicPlayerService.queueIndex).toBe(0);
    });

    it('should clamp startIndex to last item when too large', () => {
      const tracks: MusicTrack[] = [
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
      ];
      musicPlayerService.startQueue(tracks, 10);
      expect(musicPlayerService.queueIndex).toBe(1);
    });

    it('should return false for empty tracks', () => {
      expect(musicPlayerService.startQueue([])).toBe(false);
      expect(musicPlayerService.status).toBe('idle');
    });

    it('should filter out tracks without url', () => {
      musicPlayerService.startQueue([
        { url: 'https://y/1', title: 'One' },
        { title: 'NoUrl' },
        { url: '', title: 'EmptyUrl' },
        { url: 'https://y/2', title: 'Two' },
      ]);

      expect(musicPlayerService.queue).toHaveLength(2);
      expect(musicPlayerService.queueIndex).toBe(0);
    });

    it('should truncate titles to MAX_QUEUE_TITLE_LENGTH', () => {
      const longTitle = 'X'.repeat(200);
      musicPlayerService.startQueue([{ url: 'https://y/1', title: longTitle }]);
      expect(musicPlayerService.track!.title.length).toBe(120);
    });

    it('should truncate queue to MAX_QUEUE_SIZE', () => {
      const tracks: MusicTrack[] = Array.from({ length: 70 }, (_, i) => ({
        url: `https://y/${i}`,
        title: `Track ${i}`,
      }));

      musicPlayerService.startQueue(tracks, 0);
      expect(musicPlayerService.queue.length).toBe(MAX_QUEUE_SIZE);
    });

    it('should return a deep copy of the state', () => {
      musicPlayerService.startQueue([{ url: 'https://y/1', title: 'One' }]);
      const state1 = musicPlayerService.state;
      state1.queue.push({ url: 'https://y/X', title: 'Fake' });
      expect(musicPlayerService.queue.length).toBe(1);
    });

    it('should clear directUrl cache on start', () => {
      musicPlayerService.startQueue([{ url: 'https://y/1', title: 'One' }]);
      musicPlayerService.setDirectUrlFor(0, 'http://old-url');
      musicPlayerService.startQueue([{ url: 'https://y/2', title: 'Two' }]);
      expect(musicPlayerService.directUrlFor(0)).toBeNull();
    });
  });

  // ─── startTrack ──────────────────────────────────────────────
  describe('startTrack', () => {
    it('should wrap a single track in queue', () => {
      musicPlayerService.startTrack({
        url: 'https://y/1',
        title: 'Single',
        directUrl: 'http://stream',
      });

      expect(musicPlayerService.queue).toHaveLength(1);
      expect(musicPlayerService.queueIndex).toBe(0);
      expect(musicPlayerService.directUrl).toBe('http://stream');
    });

    it('should work without directUrl', () => {
      musicPlayerService.startTrack({ url: 'https://y/1', title: 'Single' });
      expect(musicPlayerService.directUrl).toBeNull();
    });
  });

  // ─── next / prev ─────────────────────────────────────────────
  describe('next', () => {
    it('should move to the next track', () => {
      musicPlayerService.startQueue([
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
        { url: 'https://y/3', title: 'Three' },
      ]);

      const next = musicPlayerService.next();
      expect(next!.title).toBe('Two');
      expect(musicPlayerService.queueIndex).toBe(1);
    });

    it('should stop the player after the last track', () => {
      musicPlayerService.startQueue([
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
      ]);

      musicPlayerService.next();
      musicPlayerService.next();

      expect(musicPlayerService.status).toBe('idle');
      expect(musicPlayerService.queue).toEqual([]);
    });

    it('should return null when idle', () => {
      expect(musicPlayerService.next()).toBeNull();
    });
  });

  describe('prev', () => {
    it('should move to the previous track', () => {
      musicPlayerService.startQueue([
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
      ]);
      musicPlayerService.next();

      const prev = musicPlayerService.prev();
      expect(prev!.title).toBe('One');
      expect(musicPlayerService.queueIndex).toBe(0);
    });

    it('should return null when on the first track', () => {
      musicPlayerService.startQueue([
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
      ]);

      expect(musicPlayerService.prev()).toBeNull();
      expect(musicPlayerService.queueIndex).toBe(0);
    });
  });

  // ─── jumpTo ──────────────────────────────────────────────────
  describe('jumpTo', () => {
    it('should jump to a valid index', () => {
      musicPlayerService.startQueue([
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
        { url: 'https://y/3', title: 'Three' },
      ]);

      const track = musicPlayerService.jumpTo(2);
      expect(track!.title).toBe('Three');
      expect(musicPlayerService.queueIndex).toBe(2);
    });

    it('should return null for out-of-bounds index', () => {
      musicPlayerService.startQueue([{ url: 'https://y/1', title: 'One' }]);
      expect(musicPlayerService.jumpTo(5)).toBeNull();
      expect(musicPlayerService.jumpTo(-1)).toBeNull();
    });
  });

  // ─── directUrl cache ─────────────────────────────────────────
  describe('directUrl cache', () => {
    it('should cache directUrl by queue index', () => {
      musicPlayerService.startQueue([
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
      ]);

      musicPlayerService.setDirectUrlFor(0, 'http://stream-1');
      musicPlayerService.setDirectUrlFor(1, 'http://stream-2');

      expect(musicPlayerService.directUrlFor(0)).toBe('http://stream-1');
      expect(musicPlayerService.directUrlFor(1)).toBe('http://stream-2');
      expect(musicPlayerService.directUrl).toBe('http://stream-1');
    });

    it('should allow setting directUrl for current queueIndex', () => {
      musicPlayerService.startQueue([{ url: 'https://y/1', title: 'One' }]);
      musicPlayerService.setDirectUrl('http://stream');
      expect(musicPlayerService.directUrl).toBe('http://stream');
    });

    it('should clear directUrl when set to null', () => {
      musicPlayerService.startQueue([{ url: 'https://y/1', title: 'One' }]);
      musicPlayerService.setDirectUrlFor(0, 'http://stream');
      musicPlayerService.setDirectUrlFor(0, null);
      expect(musicPlayerService.directUrlFor(0)).toBeNull();
    });
  });

  // ─── stop ────────────────────────────────────────────────────
  describe('stop', () => {
    it('should reset everything to idle', () => {
      musicPlayerService.startQueue([
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
      ]);
      musicPlayerService.setDirectUrlFor(0, 'http://stream');
      musicPlayerService.setStatus('playing');
      musicPlayerService.stop();

      expect(musicPlayerService.status).toBe('idle');
      expect(musicPlayerService.queue).toEqual([]);
      expect(musicPlayerService.queueIndex).toBe(-1);
      expect(musicPlayerService.track).toBeNull();
      expect(musicPlayerService.directUrl).toBeNull();
      expect(musicPlayerService.isPlaying()).toBe(false);
    });
  });

  // ─── isPlaying ───────────────────────────────────────────────
  describe('isPlaying', () => {
    it('should return true for playing and paused', () => {
      musicPlayerService.startQueue([{ url: 'https://y/1', title: 'One' }]);
      expect(musicPlayerService.isPlaying()).toBe(true);
      musicPlayerService.setStatus('playing');
      expect(musicPlayerService.isPlaying()).toBe(true);
    });

    it('should return false after stop', () => {
      musicPlayerService.stop();
      expect(musicPlayerService.isPlaying()).toBe(false);
    });
  });
});
