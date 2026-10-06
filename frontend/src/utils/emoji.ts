// Утилита определения «одиночной эмодзи» в тексте сообщения.
// Сообщение считается одиночной эмодзи, если после trim() оно состоит ровно
// из одной графемы и эта графема является эмодзи (Unicode Emoji property).
// 2 и более эмодзи, а также эмодзи вместе с текстом — обычное сообщение.

// \p{Extended_Pictographic} покрывает все эмодзи-основы; \p{Emoji_Presentation}
// — графемы, которые по умолчанию рендерятся как цветные эмодзи. Комбинация с
// модификаторами тона кожи / ZWJ-последовательностями корректно схватывается
// графемным сегментатором Intl.Segmenter.
const EMOJI_SOLO = /^\p{Extended_Pictographic}(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])*$/u;

function graphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("ru", { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }
  // Фолбэк для окружений без Intl.Segmenter: итерация по кодовым точкам.
  return Array.from(text);
}

/**
 * Возвращает текст сообщения, если он является ровно одной эмодзи, иначе null.
 */
export function extractSingleEmoji(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const parts = graphemes(trimmed);
  if (parts.length !== 1) return null;

  return EMOJI_SOLO.test(parts[0]) ? parts[0] : null;
}
