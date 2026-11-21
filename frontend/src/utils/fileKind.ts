import { isImageFile } from "./isImageFile";

/** Расширения видео, которые браузер умеет проигрывать прямо в `<video>` */
const VIDEO_EXTENSIONS = new Set([
  "mp4",
  "m4v",
  "webm",
  "ogv",
  "mov",
  "mkv",
]);

/**
 * Расширения аудио для встроенного плеера.
 * `ogg` здесь, а не среди видео: контейнер чаще используется для звука,
 * а видео в Ogg имеет отдельное расширение `ogv`.
 */
const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "ogg",
  "oga",
  "opus",
  "m4a",
  "aac",
  "flac",
  "weba",
]);

/** Расширение файла в нижнем регистре (с учётом возможных путей) */
function getExtension(filename: string): string {
  const baseName = filename.split(/[\\/]/).pop() || "";
  const dotIndex = baseName.lastIndexOf(".");
  return dotIndex > 0 ? baseName.slice(dotIndex + 1).toLowerCase() : "";
}

/**
 * Проверяет, является ли файл видео по расширению.
 * @param filename - имя файла (может содержать путь)
 */
export function isVideoFile(filename: string): boolean {
  return VIDEO_EXTENSIONS.has(getExtension(filename));
}

/**
 * Проверяет, является ли файл аудио по расширению.
 * @param filename - имя файла (может содержать путь)
 */
export function isAudioFile(filename: string): boolean {
  return AUDIO_EXTENSIONS.has(getExtension(filename));
}

/** Как показывать вложение в сообщении */
export type AttachmentKind = "image" | "video" | "audio" | "file";

/**
 * Определяет способ отображения вложения: картинка, видео и аудио
 * получают предпросмотр, остальные файлы — строку со ссылкой на скачивание.
 */
export function getAttachmentKind(filename: string): AttachmentKind {
  if (isImageFile(filename)) return "image";
  if (isVideoFile(filename)) return "video";
  if (isAudioFile(filename)) return "audio";
  return "file";
}
