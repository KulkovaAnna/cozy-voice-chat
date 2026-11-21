import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Мок yt-dlp: сетевые вызовы в тестах команд не нужны ───────
const ytDlpMock = vi.hoisted(() => ({
  fetchTrackInfo: vi.fn(),
  fetchPlaylistTracks: vi.fn(),
  isPlaylistUrl: vi.fn(),
  YTDLP_USER_AGENT: 'test-agent',
}));

vi.mock('../../src/app/modules/music-player/yt-dlp', () => ytDlpMock);

import { COMMANDS } from '../../src/signaling-v2/SlashCommands/commands';
import musicPlayerService, {
  MAX_QUEUE_SIZE,
} from '../../src/app/modules/music-player/music-player.service';

const TEST_CALL_ID = 'call-1';

type Handler = (
  args: string,
  senderId: string,
  callId: string,
  report: (text: string) => void,
) => Promise<{ text: string }>;

/** Плеер тестового звонка (у каждого звонка своя очередь) */
function player() {
  return musicPlayerService.forCall(TEST_CALL_ID);
}

function playHandler(): Handler {
  const command = COMMANDS.find((c) => c.name === 'play');
  if (!command) throw new Error('Команда /play не найдена');
  return command.handler as Handler;
}

async function runPlay(args: string): Promise<{ text: string; stages: string[] }> {
  const stages: string[] = [];
  const result = await playHandler()(args, 'user-1', TEST_CALL_ID, (text) =>
    stages.push(text),
  );
  return { text: result.text, stages };
}

function makeTracks(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    url: `https://www.youtube.com/watch?v=${i}`,
    title: `Track ${i + 1}`,
    uploader: `Artist ${i + 1}`,
    duration: 60,
  }));
}

describe('/play command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    musicPlayerService.destroy(TEST_CALL_ID);
  });

  // ─── одиночный трек ──────────────────────────────────────────
  describe('single track', () => {
    it('should queue one track and report it is ready', async () => {
      ytDlpMock.isPlaylistUrl.mockReturnValue(false);
      ytDlpMock.fetchTrackInfo.mockResolvedValue({
        title: 'Never Gonna Give You Up',
        uploader: 'Rick Astley',
        duration: 213,
        directUrl: 'https://stream',
      });

      const { text, stages } = await runPlay(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      );

      expect(text).toContain('Rick Astley');
      expect(text).toContain('3:33');
      expect(text).toContain('Нажмите ▶');
      expect(stages).toEqual(['Разбираю ссылку…', 'Готовлю трек…']);

      expect(player().queue).toHaveLength(1);
      expect(player().directUrl).toBe('https://stream');
    });

    it('should report an error when the stream url is missing', async () => {
      ytDlpMock.isPlaylistUrl.mockReturnValue(false);
      ytDlpMock.fetchTrackInfo.mockResolvedValue({
        title: 'Bad track',
        uploader: null,
        duration: null,
        directUrl: null,
      });

      const { text } = await runPlay('https://www.youtube.com/watch?v=bad');

      expect(text).toContain('Не удалось получить аудио-поток');
      expect(player().isPlaying()).toBe(false);
    });
  });

  // ─── плейлист ────────────────────────────────────────────────
  describe('playlist', () => {
    const playlistUrl = 'https://www.youtube.com/playlist?list=PLabc';

    it('should detect a playlist and queue all tracks', async () => {
      ytDlpMock.isPlaylistUrl.mockReturnValue(true);
      ytDlpMock.fetchPlaylistTracks.mockResolvedValue({
        playlistTitle: 'Chill Mix',
        totalCount: 42,
        trackCount: 42,
        tracks: makeTracks(42),
      });

      const { text, stages } = await runPlay(playlistUrl);

      expect(ytDlpMock.fetchPlaylistTracks).toHaveBeenCalledWith(
        playlistUrl,
        MAX_QUEUE_SIZE,
      );
      expect(stages).toContain('Читаю плейлист…');

      expect(player().queue).toHaveLength(42);
      expect(player().queueIndex).toBe(0);
      expect(player().status).toBe('paused');

      expect(text).toContain('Chill Mix');
      expect(text).toContain('42 трека');
      expect(text).toContain('Нажмите ▶');
    });

    it('should mention the original size when the queue was truncated', async () => {
      ytDlpMock.isPlaylistUrl.mockReturnValue(true);
      ytDlpMock.fetchPlaylistTracks.mockResolvedValue({
        playlistTitle: 'Huge Mix',
        totalCount: 137,
        trackCount: 50,
        tracks: makeTracks(50),
      });

      const { text } = await runPlay(playlistUrl);

      expect(text).toContain('50 треков из 137');
      expect(text).not.toContain('Ошибка');
      expect(player().queue).toHaveLength(MAX_QUEUE_SIZE);
    });

    it('should format total duration over an hour as hh:mm:ss', async () => {
      ytDlpMock.isPlaylistUrl.mockReturnValue(true);
      ytDlpMock.fetchPlaylistTracks.mockResolvedValue({
        playlistTitle: 'Long Mix',
        totalCount: 100,
        trackCount: 100,
        tracks: Array.from({ length: 100 }, (_, i) => ({
          url: `https://www.youtube.com/watch?v=${i}`,
          title: `Track ${i}`,
          uploader: null,
          duration: 60,
        })),
      });

      const { text } = await runPlay(playlistUrl);

      expect(text).toContain('⏱ 1:40:00');
    });

    it('should skip the duration when the source reports none', async () => {
      ytDlpMock.isPlaylistUrl.mockReturnValue(true);
      ytDlpMock.fetchPlaylistTracks.mockResolvedValue({
        playlistTitle: 'No durations',
        totalCount: 2,
        trackCount: 2,
        tracks: [
          { url: 'https://y/1', title: 'A', uploader: null, duration: null },
          { url: 'https://y/2', title: 'B', uploader: null, duration: null },
        ],
      });

      const { text } = await runPlay(playlistUrl);

      expect(text).not.toContain('⏱');
    });

    it('should surface yt-dlp errors as command text', async () => {
      ytDlpMock.isPlaylistUrl.mockReturnValue(true);
      ytDlpMock.fetchPlaylistTracks.mockRejectedValue(
        new Error('В плейлисте не нашлось ни одного доступного трека'),
      );

      const { text } = await runPlay(playlistUrl);

      expect(text).toContain('Ошибка при загрузке');
      expect(player().isPlaying()).toBe(false);
    });
  });

  // ─── валидация аргументов ────────────────────────────────────
  describe('arguments', () => {
    it('should ask for a link when args are empty', async () => {
      const { text } = await runPlay('   ');
      expect(text).toContain('Укажите ссылку');
      expect(ytDlpMock.fetchTrackInfo).not.toHaveBeenCalled();
    });

    it('should reject a non-url argument', async () => {
      const { text } = await runPlay('просто текст');
      expect(text).toContain('Некорректный URL');
      expect(ytDlpMock.fetchTrackInfo).not.toHaveBeenCalled();
    });
  });

  // ─── /help ───────────────────────────────────────────────────
  describe('/help', () => {
    it('should list the play command', async () => {
      const help = COMMANDS.find((c) => c.name === 'help')!;
      const result = await (help.handler as Handler)(
        '',
        'user-1',
        TEST_CALL_ID,
        () => {},
      );

      expect(result.text).toContain('/play');
    });
  });
});
