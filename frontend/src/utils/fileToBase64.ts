// Максимальный размер файла для конвертации в base64 (1 МБ) —
// совпадает с ограничением аватара на сервере.
export const MAX_FILE_SIZE_BYTES = 1024 * 1024;

export class FileTooLargeError extends Error {
  constructor(maxSize: number = MAX_FILE_SIZE_BYTES) {
    super(`Файл превышает максимальный размер ${Math.floor(maxSize / 1024 / 1024)} МБ`);
    this.name = "FileTooLargeError";
  }
}

/**
 * Читает файл и возвращает его содержимое в виде data URL (base64).
 * Бросает FileTooLargeError, если файл больше maxSize.
 */
export function fileToBase64(
  file: File,
  maxSize: number = MAX_FILE_SIZE_BYTES,
): Promise<string> {
  if (file.size > maxSize) {
    return Promise.reject(new FileTooLargeError(maxSize));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Не удалось прочитать файл"));
      }
    };

    reader.onerror = () => reject(new Error("Ошибка чтения файла"));

    reader.readAsDataURL(file);
  });
}
