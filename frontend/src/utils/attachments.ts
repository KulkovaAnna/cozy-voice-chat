/**
 * Утилиты прикрепления файлов к сообщениям чата:
 * drag-n-drop над панелью чата и вставка из буфера обмена.
 */

/** Расширения по MIME-типу для картинок из буфера обмена */
const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

/** Имя по умолчанию у картинок из буфера: image.png / blob */
const GENERIC_FILE_NAME = /^(image|blob)(\.[\w-]+)?$/i;

/** Папка приходит как File с нулевым размером и пустым MIME-типом */
function isDirectoryLike(file: File): boolean {
  return file.size === 0 && file.type === "";
}

/**
 * Проверяет, что drag содержит файлы, а не текст или ссылку.
 * Нужна, чтобы не перехватывать обычное перетаскивание текста.
 */
export function isFileDrag(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;

  if (dataTransfer.types?.length) {
    return Array.from(dataTransfer.types).includes("Files");
  }

  return dataTransfer.files.length > 0;
}

/** Достаёт файлы из items (drop и clipboard) с откатом на .files */
function collectFiles(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) return [];

  const files: File[] = [];
  const items = dataTransfer.items;

  if (items?.length) {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (item.kind !== "file") continue;

      const file = item.getAsFile();
      if (file && !isDirectoryLike(file)) files.push(file);
    }
  }

  if (files.length === 0) {
    for (let index = 0; index < dataTransfer.files.length; index += 1) {
      const file = dataTransfer.files[index];
      if (!isDirectoryLike(file)) files.push(file);
    }
  }

  return files;
}

/** Файлы, перетянутые в окно браузера */
export function extractDroppedFiles(
  dataTransfer: DataTransfer | null,
): File[] {
  return collectFiles(dataTransfer);
}

/** Файлы из буфера обмена: скриншот или файл, скопированный в проводнике */
export function extractClipboardFiles(
  dataTransfer: DataTransfer | null,
): File[] {
  return collectFiles(dataTransfer);
}

function extensionFor(file: File): string {
  const byMime = MIME_EXTENSIONS[file.type] ?? file.type.split("/")[1];
  if (byMime) return byMime;

  const dotIndex = file.name.lastIndexOf(".");
  return dotIndex > 0 ? file.name.slice(dotIndex + 1) : "bin";
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Время в формате YYYYMMDDHHmmss — как в именах скриншотов Windows */
function timestamp(now: Date): string {
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

/**
 * Даёт вставленному из буфера файлу понятное имя: скриншоты приходят
 * как image.png или blob, из-за чего в чате непонятно, что это за файл.
 */
export function namePastedFile(file: File, now: Date = new Date()): File {
  const name = file.name.trim();
  if (name && !GENERIC_FILE_NAME.test(name)) return file;

  const prefix = file.type.startsWith("image/")
    ? "Pasted image"
    : "Pasted file";
  const pastedName = `${prefix} ${timestamp(now)}.${extensionFor(file)}`;

  return new File([file], pastedName, {
    type: file.type,
    lastModified: file.lastModified,
  });
}
