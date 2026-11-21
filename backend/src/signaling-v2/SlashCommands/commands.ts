import musicPlayerService, {
  MAX_QUEUE_SIZE,
} from '../../app/modules/music-player/music-player.service';
import {
  fetchPlaylistTracks,
  fetchTrackInfo,
  isPlaylistUrl,
} from '../../app/modules/music-player/yt-dlp';
import { SlashCommand } from './types';

/** Регулярка для проверки URL источника */
const MUSIC_URL_RE = /^https?:\/\//;

/** Форматирование длительности мм:сс */
function formatDuration(seconds: number | null): string | null {
  if (!seconds || !Number.isFinite(seconds)) return null;
  const total = Math.round(seconds);
  const mm = Math.floor(total / 60);
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/** Форматирование суммарной длительности: чч:мм:сс для длинных списков */
function formatTotalDuration(seconds: number): string {
  const total = Math.round(seconds);
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = String(total % 60).padStart(2, '0');

  return hh > 0
    ? `${hh}:${String(mm).padStart(2, '0')}:${ss}`
    : `${mm}:${ss.padStart(2, '0')}`;
}

/** Склонение существительного по числу: 1 трек, 2 трека, 5 треков */
function plural(count: number, forms: [string, string, string]): string {
  const n = Math.abs(count) % 100;
  const last = n % 10;

  if (n > 10 && n < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

/** Один трек или плейлист + число доступных треков */
function trackWord(count: number): string {
  return `${count} ${plural(count, ['трек', 'трека', 'треков'])}`;
}

export const COMMANDS: SlashCommand[] = [
  {
    name: 'help',
    description: 'Показать список доступных команд',
    handler: () => ({
      text: `Доступные команды:${COMMANDS.map((c) => `\n• /${c.name} — ${c.description}`)}`,
    }),
  },
  {
    name: 'play',
    description: 'Подготовить трек или плейлист по ссылке YouTube/SoundCloud',
    handler: async (args, _senderId, callId, report) => {
      const url = args.trim();

      if (!url) {
        return {
          text: 'Укажите ссылку на видео или плейлист: /play https://www.youtube.com/watch?v=...',
        };
      }

      if (!MUSIC_URL_RE.test(url)) {
        return {
          text: 'Некорректный URL. Нужна ссылка на видео или плейлист YouTube/SoundCloud.',
        };
      }

      try {
        if (isPlaylistUrl(url)) {
          return await playPlaylist(url, callId, report);
        }
        return await playSingleTrack(url, callId, report);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return { text: `Ошибка при загрузке: ${msg}` };
      }
    },
  },
];

/**
 * Плейлист: разбираем список плоским режимом, ставим в очередь.
 * Лишние сверх лимита треки просто отбрасываются — это не ошибка.
 */
async function playPlaylist(
  url: string,
  callId: string,
  report: (text: string) => void,
): Promise<{ text: string }> {
  report('Читаю плейлист…');
  const playlist = await fetchPlaylistTracks(url, MAX_QUEUE_SIZE);

  report('Ставлю треки в очередь…');
  if (!musicPlayerService.forCall(callId).startQueue(playlist.tracks, 0)) {
    return { text: 'В плейлисте не нашлось доступных треков.' };
  }

  const parts = [`🎵 ${playlist.playlistTitle}`];

  const truncated =
    playlist.totalCount !== null && playlist.totalCount > playlist.trackCount;

  parts.push(
    truncated
      ? `${trackWord(playlist.trackCount)} из ${playlist.totalCount}`
      : trackWord(playlist.trackCount),
  );

  const known = playlist.tracks.filter(
    (track) => typeof track.duration === 'number',
  );

  if (known.length > 0) {
    const total = known.reduce((sum, track) => sum + (track.duration ?? 0), 0);
    parts.push(`⏱ ${formatTotalDuration(total)}`);
  }

  parts.push('Нажмите ▶');

  return { text: parts.join(' · ') };
}

/** Одиночное видео: метаданные и прямая ссылка получаются сразу */
async function playSingleTrack(
  url: string,
  callId: string,
  report: (text: string) => void,
): Promise<{ text: string }> {
  report('Разбираю ссылку…');
  const info = await fetchTrackInfo(url);

  if (!info.directUrl) {
    return {
      text: `Не удалось получить аудио-поток для «${info.title}». Попробуйте другое видео.`,
    };
  }

  report('Готовлю трек…');
  musicPlayerService.forCall(callId).startTrack({
    url,
    title: info.title,
    uploader: info.uploader,
    duration: info.duration,
    directUrl: info.directUrl,
  });

  const duration = formatDuration(info.duration);
  const header = info.uploader
    ? `🎵 ${info.uploader} — ${info.title}`
    : `🎵 ${info.title}`;
  const meta = duration ? ` · ⏱ ${duration}` : '';

  return {
    text: `${header}${meta} · Нажмите ▶ в плеере`,
  };
}
