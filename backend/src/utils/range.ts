/** Диапазон байт файла (границы включительно) */
export interface ByteRange {
  start: number;
  end: number;
}

/**
 * Результат разбора заголовка `Range`:
 * - `none` — заголовка нет или он не поддерживается, отдаём файл целиком;
 * - `satisfiable` — валидный диапазон, отвечаем 206;
 * - `unsatisfiable` — диапазон вне файла, отвечаем 416.
 */
export type RangeParseResult =
  | { type: 'none' }
  | { type: 'satisfiable'; range: ByteRange }
  | { type: 'unsatisfiable' };

/** Поддерживаем только одиночный диапазон: медиаэлементы браузера просят именно его */
const RANGE_PATTERN = /^bytes=(\d*)-(\d*)$/;

/**
 * Разбирает заголовок `Range` для файла известного размера.
 * Поддерживаются формы `bytes=start-end`, `bytes=start-` и `bytes=-suffix`.
 * `Content-Range` при 416 здесь не отдаётся: контроллер вернёт JSON-ошибку.
 */
export function parseRangeHeader(
  header: string | undefined,
  size: number,
): RangeParseResult {
  if (!header) return { type: 'none' };

  const match = RANGE_PATTERN.exec(header.trim().toLowerCase());
  if (!match) return { type: 'none' };

  const [, rawStart, rawEnd] = match;
  // "bytes=-" — некорректный диапазон, отдаём файл целиком
  if (!rawStart && !rawEnd) return { type: 'none' };
  if (size <= 0) return { type: 'unsatisfiable' };

  // bytes=-500 — последние 500 байт файла
  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return { type: 'unsatisfiable' };
    }
    return {
      type: 'satisfiable',
      range: { start: Math.max(size - suffixLength, 0), end: size - 1 },
    };
  }

  const start = Number(rawStart);
  if (!Number.isFinite(start) || start >= size) {
    return { type: 'unsatisfiable' };
  }

  // bytes=100- — до конца файла, конец за размером обрезаем
  const end = rawEnd ? Math.min(Number(rawEnd), size - 1) : size - 1;
  if (!Number.isFinite(end) || start > end) {
    return { type: 'unsatisfiable' };
  }

  return { type: 'satisfiable', range: { start, end } };
}
