import { API_URLS } from "./config";
import { fetcher } from "./fetcher";

const PROFILE_FILE_PREFIX = `${API_URLS.BASE_URL}/files/profile/`;

/**
 * Загружает файл профиля (аватар/фон карточки) на сервер
 * и возвращает его постоянный URL.
 */
export async function uploadProfileFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetcher("/files/profile/avatar", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Не удалось загрузить файл профиля");
  }

  const { fileId } = (await res.json()) as { fileId: string };
  return `${PROFILE_FILE_PREFIX}${fileId}`;
}

/**
 * Удаляет файл профиля по его URL (fire-and-forget).
 * URL, не относящиеся к файловому хранилищу профиля, игнорируются.
 */
export function deleteProfileFile(url: string | null | undefined): void {
  if (!url || !url.startsWith(PROFILE_FILE_PREFIX)) return;

  const fileId = url.slice(PROFILE_FILE_PREFIX.length);
  if (!fileId) return;

  fetcher(`/files/profile/${fileId}`, { method: "DELETE" }).catch(() => {});
}
