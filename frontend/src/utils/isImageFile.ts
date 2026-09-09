/**
 * Проверяет, является ли файл изображением на основе его расширения.
 * @param filename - имя файла (может содержать путь)
 * @returns true, если расширение соответствует известному формату изображения
 */
export function isImageFile(filename: string): boolean {
  // Множество допустимых расширений изображений (в нижнем регистре)
  const imageExtensions = new Set([
    "jpg",
    "jpeg",
    "png",
    "gif",
    "bmp",
    "webp",
    "svg",
    "tiff",
    "tif",
    "ico",
    "avif",
    "heic",
    "heif",
  ]);

  // Извлекаем расширение: берём всё после последней точки,
  // игнорируя возможные пути (слеши)
  const baseName = filename.split(/[\\/]/).pop() || "";
  const ext = baseName.split(".").pop()?.toLowerCase();

  // Если расширение есть и оно входит в множество — возвращаем true
  return ext ? imageExtensions.has(ext) : false;
}
