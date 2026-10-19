import { describe, it, expect, vi, beforeEach } from 'vitest';

// Моки child_process.execFile до импорта yt-dlp
const hoisted = vi.hoisted(() => ({
  mockExecFile: vi.fn(),
  ytdlpOutput: { stdout: '', stderr: '' },
}));

hoisted.mockExecFile.mockImplementation(
  (
    _bin: string,
    _args: string[],
    _opts: unknown,
    cb: (err: Error | null, stdout: string, stderr: string) => void,
  ) => {
    cb(null, hoisted.ytdlpOutput.stdout, hoisted.ytdlpOutput.stderr);
  },
);

vi.mock('child_process', () => ({
  execFile: hoisted.mockExecFile,
}));

import {
  fetchPlaylistTracks,
  fetchTrackInfo,
  isPlaylistUrl,
} from '../../src/app/modules/music-player/yt-dlp';

describe('yt-dlp helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.ytdlpOutput.stdout = '';
    hoisted.ytdlpOutput.stderr = '';
  });

  // ─── isPlaylistUrl ───────────────────────────────────────────
  describe('isPlaylistUrl', () => {
    it('should detect YouTube playlist URL', () => {
      expect(isPlaylistUrl('https://www.youtube.com/playlist?list=PLxxx')).toBe(
        true,
      );
    });

    it('should detect YouTube watch with list param', () => {
      expect(
        isPlaylistUrl('https://www.youtube.com/watch?v=abc123&list=PLxxx'),
      ).toBe(true);
    });

    it('should detect YouTube playlist path', () => {
      expect(isPlaylistUrl('https://www.youtube.com/playlist?list=PLxxx')).toBe(
        true,
      );
    });

    it('should detect SoundCloud set', () => {
      expect(isPlaylistUrl('https://soundcloud.com/user/sets/my-set')).toBe(
        true,
      );
    });

    it('should return false for a single video', () => {
      expect(isPlaylistUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
        false,
      );
    });
  });

  // ─── fetchPlaylistTracks ─────────────────────────────────────
  describe('fetchPlaylistTracks', () => {
    it('should call yt-dlp with flat-playlist flags', async () => {
      hoisted.ytdlpOutput.stdout = JSON.stringify({
        title: 'My Playlist',
        playlist_count: 137,
        entries: [
          {
            id: 'a',
            title: 'Track A',
            uploader: 'Artist A',
            duration: 120,
            page_url: 'https://www.youtube.com/watch?v=a',
          },
          {
            id: 'b',
            title: 'Track B',
            uploader: 'Artist B',
            duration: 200,
            page_url: 'https://www.youtube.com/watch?v=b',
          },
        ],
      });

      const result = await fetchPlaylistTracks(
        'https://youtube.com/playlist?list=PLx',
        50,
      );

      const call = hoisted.mockExecFile.mock.calls[0];
      const args = call[1] as string[];

      expect(args).toContain('--flat-playlist');
      expect(args).toContain('--playlist-items');
      expect(args).toContain('1-50');
      expect(args).toContain('--dump-single-json');
      expect(args).toContain('--no-warnings');

      expect(result.playlistTitle).toBe('My Playlist');
      expect(result.totalCount).toBe(137);
      expect(result.trackCount).toBe(2);
      expect(result.tracks[0].title).toBe('Track A');
      expect(result.tracks[1].url).toBe('https://www.youtube.com/watch?v=b');
    });

    it('should truncate entries to the limit', async () => {
      const entries = Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        title: `Track ${i}`,
        uploader: null,
        duration: null,
        page_url: `https://www.youtube.com/watch?v=${i}`,
      }));

      hoisted.ytdlpOutput.stdout = JSON.stringify({
        playlist_count: 100,
        entries,
      });

      const result = await fetchPlaylistTracks('https://y/playlist', 50);

      expect(result.trackCount).toBe(50);
      expect(result.tracks[49].title).toBe('Track 49');
    });

    it('should handle entries without uploader', async () => {
      hoisted.ytdlpOutput.stdout = JSON.stringify({
        entries: [
          {
            id: 'a',
            title: 'No uploader',
            duration: null,
            page_url: 'https://www.youtube.com/watch?v=a',
          },
        ],
      });

      const result = await fetchPlaylistTracks('https://y/playlist', 10);

      expect(result.tracks[0].uploader).toBeNull();
    });

    it('should use channel as fallback for uploader', async () => {
      hoisted.ytdlpOutput.stdout = JSON.stringify({
        entries: [
          {
            id: 'a',
            title: 'Channel fallback',
            channel: 'ChName',
            page_url: 'https://www.youtube.com/watch?v=a',
          },
        ],
      });

      const result = await fetchPlaylistTracks('https://y/playlist', 10);

      expect(result.tracks[0].uploader).toBe('ChName');
    });

    it('should skip entries without a valid url', async () => {
      hoisted.ytdlpOutput.stdout = JSON.stringify({
        entries: [
          {
            id: 'a',
            title: 'Valid',
            page_url: 'https://www.youtube.com/watch?v=a',
          },
          { id: 'b', title: 'NoUrl' }, // нет page_url / url
          {
            id: 'c',
            title: 'Also valid',
            page_url: 'https://www.youtube.com/watch?v=c',
          },
        ],
      });

      const result = await fetchPlaylistTracks('https://y/playlist', 10);

      expect(result.tracks).toHaveLength(2);
      expect(result.tracks[1].url).toBe('https://www.youtube.com/watch?v=c');
    });

    it('should return a single entry when no entries array exists', async () => {
      hoisted.ytdlpOutput.stdout = JSON.stringify({
        id: 'single',
        title: 'Solo video',
        uploader: 'Solo',
        duration: 60,
        url: 'https://www.youtube.com/watch?v=single',
      });

      const result = await fetchPlaylistTracks(
        'https://www.youtube.com/watch?v=single',
        10,
      );

      expect(result.trackCount).toBe(1);
      expect(result.tracks[0].title).toBe('Solo video');
      expect(result.totalCount).toBe(1);
    });

    it('should throw when no entries found', async () => {
      hoisted.ytdlpOutput.stdout = JSON.stringify({ entries: [] });

      await expect(fetchPlaylistTracks('https://y/empty', 10)).rejects.toThrow(
        'не нашлось ни одного',
      );
    });

    it('should throw when yt-dlp returns no JSON', async () => {
      hoisted.ytdlpOutput.stdout = 'some garbage output';

      await expect(fetchPlaylistTracks('https://y/bad', 10)).rejects.toThrow();
    });

    it('should handle yt-dlp stdout with leading warnings', async () => {
      hoisted.ytdlpOutput.stdout =
        'WARNING: some warning\n' +
        JSON.stringify({
          playlist_count: 1,
          entries: [
            {
              id: 'x',
              title: 'After warning',
              page_url: 'https://www.youtube.com/watch?v=x',
            },
          ],
        });

      const result = await fetchPlaylistTracks('https://y/playlist', 10);

      expect(result.tracks[0].title).toBe('After warning');
    });
  });

  // ─── fetchTrackInfo ──────────────────────────────────────────
  describe('fetchTrackInfo', () => {
    // Формат вывода: title ␁ uploader ␁ duration ␁ url
    it('should request bestaudio and return parsed track info', async () => {
      hoisted.ytdlpOutput.stdout =
        'Never Gonna Give You Up\u0001Rick Astley\u0001213\u0001https://rr1---sn.googlevideo.com/stream';

      const info = await fetchTrackInfo(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      );

      expect(info.title).toBe('Never Gonna Give You Up');
      expect(info.uploader).toBe('Rick Astley');
      expect(info.duration).toBe(213);
      expect(info.directUrl).toBe('https://rr1---sn.googlevideo.com/stream');

      const args = hoisted.mockExecFile.mock.calls[0][1] as string[];
      expect(args).toContain('bestaudio[ext=m4a]/bestaudio/best');
      expect(args).toContain('--no-playlist');
      expect(args).toContain('--print');
    });

    it('should use the last non-empty line from stdout', async () => {
      hoisted.ytdlpOutput.stdout =
        'WARNING: deprecated flag\n' +
        'Title\u0001Uploader\u0001100\u0001https://stream';

      const info = await fetchTrackInfo('https://www.youtube.com/watch?v=x');

      expect(info.title).toBe('Title');
      expect(info.directUrl).toBe('https://stream');
    });

    it('should treat NA uploader as null', async () => {
      hoisted.ytdlpOutput.stdout = 'Track\u0001NA\u000150\u0001https://s';

      const info = await fetchTrackInfo('https://www.youtube.com/watch?v=x');

      expect(info.uploader).toBeNull();
      expect(info.duration).toBe(50);
    });

    it('should treat NA duration as null', async () => {
      hoisted.ytdlpOutput.stdout = 'Track\u0001Artist\u0001NA\u0001https://s';

      const info = await fetchTrackInfo('https://www.youtube.com/watch?v=x');

      expect(info.duration).toBeNull();
    });

    it('should return null directUrl when the source gives none', async () => {
      hoisted.ytdlpOutput.stdout = 'Track\u0001Artist\u000150\u0001NA';

      const info = await fetchTrackInfo('https://www.youtube.com/watch?v=x');

      expect(info.directUrl).toBeNull();
    });

    it('should use "Неизвестный трек" for empty title', async () => {
      hoisted.ytdlpOutput.stdout = '\u0001Artist\u000150\u0001https://s';

      const info = await fetchTrackInfo('https://www.youtube.com/watch?v=x');

      expect(info.title).toBe('Неизвестный трек');
    });

    it('should throw when yt-dlp returns nothing', async () => {
      hoisted.ytdlpOutput.stdout = '';

      await expect(
        fetchTrackInfo('https://www.youtube.com/watch?v=x'),
      ).rejects.toThrow('yt-dlp не вернул данные трека');
    });
  });
});
