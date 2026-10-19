import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';

/** Возможные имена бинарника под разные ОС */
const BIN_NAMES = ['yt-dlp.exe', 'yt-dlp'];

/** Кэш найденного пути к бинарнику */
let cachedBinPath: string | null = null;

/**
 * Список потенциальных путей к yt-dlp.
 * Порядок: явная переменная окружения → рабочая директория →
 * подъём вверх от __dirname (работает и для src при dev, и для dist после сборки).
 */
function candidatePaths(): string[] {
  const result: string[] = [];

  const fromEnv = process.env.YT_DLP_PATH;
  if (fromEnv) {
    result.push(fromEnv);
  }

  // Сервер обычно запускается из папки backend/
  for (const name of BIN_NAMES) {
    result.push(path.resolve(process.cwd(), name));
  }

  let dir = __dirname;
  for (let depth = 0; depth < 8; depth += 1) {
    for (const name of BIN_NAMES) {
      result.push(path.join(dir, name));
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return result;
}

/**
 * Возвращает абсолютный путь к бинарнику yt-dlp.
 * Бросает ошибку с понятным текстом, если бинарник не найден.
 */
export function resolveYtdlpPath(): string {
  if (cachedBinPath) return cachedBinPath;

  for (const candidate of candidatePaths()) {
    if (fs.existsSync(candidate)) {
      cachedBinPath = candidate;
      return candidate;
    }
  }

  throw new Error(
    'Не найден бинарник yt-dlp. Положите yt-dlp.exe в папку backend/ ' +
      'или укажите путь через переменную окружения YT_DLP_PATH.',
  );
}

/** Промис-обёртка над execFile для yt-dlp */
function runYtdlp(args: string[]): Promise<string> {
  const bin = resolveYtdlpPath();

  return new Promise((resolve, reject) => {
    execFile(
      bin,
      args,
      { maxBuffer: 10 * 1024 * 1024, timeout: 60_000 },
      (error, stdout, stderr) => {
        if (error) {
          const detail = String(stderr || error.message).trim();
          reject(new Error(detail || 'yt-dlp завершился с ошибкой'));
          return;
        }
        resolve(stdout);
      },
    );
  });
}

/** Метаданные трека, полученные из yt-dlp */
export interface YtdlpTrackInfo {
  title: string;
  /** Прямая ссылка на аудио-поток */
  directUrl: string | null;
  /** Длительность в секундах */
  duration: number | null;
  /** Исполнитель */
  uploader: string | null;
}

/**
 * User-Agent, под которым yt-dlp извлекает ссылку. Тот же UA нужно
 * использовать при скачивании потока — YouTube проверяет связку UA + подпись URL.
 */
export const YTDLP_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/** Разделитель полей в выводе yt-dlp --print */
const FIELD_SEPARATOR = '\u0001';

/**
 * Возвращает метаданные трека и прямую ссылку на аудио-поток.
 * @param url — страница YouTube/SoundCloud
 */
export async function fetchTrackInfo(url: string): Promise<YtdlpTrackInfo> {
  const stdout = await runYtdlp([
    // Приоритет у m4a: он воспроизводится всеми браузерами, в отличие от webm/opus
    '-f',
    'bestaudio[ext=m4a]/bestaudio/best',
    '--no-playlist',
    '--skip-download',
    '--user-agent',
    YTDLP_USER_AGENT,
    '--print',
    ['%(title)s', '%(uploader)s', '%(duration)s', '%(url)s'].join(
      FIELD_SEPARATOR,
    ),
    url,
  ]);

  const lastLine = stdout
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .pop();

  if (!lastLine) {
    throw new Error('yt-dlp не вернул данные трека');
  }

  const [title, uploader, duration, ...rest] = lastLine.split(FIELD_SEPARATOR);

  return {
    title: cleanField(title) || 'Неизвестный трек',
    uploader: toNullable(cleanField(uploader)),
    duration: parseDuration(duration),
    directUrl: toNullable(cleanField(rest.join(FIELD_SEPARATOR))),
  };
}

/** yt-dlp печатает «NA» для отсутствующих полей */
function cleanField(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed || trimmed === 'NA') return null;
  return trimmed;
}

function toNullable(value: string | null): string | null {
  return value && value.length > 0 ? value : null;
}

function parseDuration(value: string | undefined): number | null {
  const cleaned = cleanField(value);
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Признак того, что ссылка ведёт на плейлист, а не на отдельное видео.
 * YouTube: playlist?list=..., watch?v=...&list=...
 * SoundCloud: /sets/...
 */
const PLAYLIST_URL_RES = [
  /[?&]list=[A-Za-z0-9_-]+/,
  /\/\/[^\s]*youtube\.com\/playlist\?/,
  /\/\/[^\s]*soundcloud\.com\/[^\s/]+\/sets\/[^\s/?#]+/,
];

export function isPlaylistUrl(url: string): boolean {
  return PLAYLIST_URL_RES.some((re) => re.test(url));
}

/** Трек из плейлиста (прямой ссылки здесь ещё нет — она получается лениво) */
export interface YtdlpPlaylistTrack {
  url: string;
  title: string;
  uploader: string | null;
  duration: number | null;
}

/** Результат разбора плейлиста */
export interface YtdlpPlaylistInfo {
  playlistTitle: string;
  /** Полное число треков в плейлисте, если источник его сообщил */
  totalCount: number | null;
  /** Сколько треков реально разобрано (с учётом лимита) */
  trackCount: number;
  tracks: YtdlpPlaylistTrack[];
}

/**
 * Разбирает плейлист: возвращает метаданные треков без прямых ссылок.
 * --flat-playlist не скачивает форматы, поэтому разбор занимает секунды.
 * --playlist-items обрезает список на уровне yt-dlp — лишнее не тянется.
 * @param url — ссылка на плейлист
 * @param limit — максимум треков в очереди
 */
export async function fetchPlaylistTracks(
  url: string,
  limit: number,
): Promise<YtdlpPlaylistInfo> {
  const stdout = await runYtdlp([
    '--flat-playlist',
    '--playlist-items',
    `1-${limit}`,
    '--no-warnings',
    '--dump-single-json',
    '--user-agent',
    YTDLP_USER_AGENT,
    url,
  ]);

  const data = parseJsonOutput(stdout);
  const entries = collectEntries(data);

  // Источник может вернуть одиночный трек вместо плейлиста
  if (entries.length === 0) {
    const single = parseEntry(data, 0);
    if (!single) throw new Error('В плейлисте не нашлось ни одного трека');
    return {
      playlistTitle: single.title,
      totalCount: 1,
      trackCount: 1,
      tracks: [single],
    };
  }

  const tracks = entries
    .map((entry, index) => parseEntry(entry, index))
    .filter((track): track is YtdlpPlaylistTrack => track !== null)
    .slice(0, limit);

  if (tracks.length === 0) {
    throw new Error('В плейлисте не нашлось ни одного доступного трека');
  }

  return {
    playlistTitle: cleanField(asString(data.title)) || 'Плейлист без названия',
    totalCount: parseCount(data.playlist_count) ?? parseCount(data.n_entries),
    trackCount: tracks.length,
    tracks,
  };
}

/** --dump-single-json иногда предваряется предупреждениями — вырезаем JSON */
function parseJsonOutput(stdout: string): Record<string, unknown> {
  const text = stdout.trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end <= start) {
    throw new Error('yt-dlp не вернул данные плейлиста');
  }

  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    throw new Error('Не удалось разобрать ответ yt-dlp');
  }
}

function collectEntries(
  data: Record<string, unknown>,
): Record<string, unknown>[] {
  const entries = Array.isArray(data.entries) ? data.entries : [];
  return entries.filter(
    (entry): entry is Record<string, unknown> =>
      typeof entry === 'object' && entry !== null,
  );
}

function parseEntry(
  entry: Record<string, unknown>,
  index: number,
): YtdlpPlaylistTrack | null {
  // В flat-режиме ссылка лежит в page_url / url / webpage_url — берём первую попавшуюся
  const url =
    cleanField(asString(entry.page_url)) ??
    cleanField(asString(entry.url)) ??
    cleanField(asString(entry.webpage_url));

  if (!url || !MUSIC_SOURCE_URL_RES.test(url)) return null;

  return {
    url,
    title: cleanField(asString(entry.title)) || `Трек ${index + 1}`,
    uploader:
      cleanField(asString(entry.uploader)) ??
      cleanField(asString(entry.channel)) ??
      null,
    duration: parseDurationField(entry.duration),
  };
}

const MUSIC_SOURCE_URL_RES = /^https?:\/\//;

function parseDurationField(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  return parseDuration(asString(value));
}

function parseCount(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
