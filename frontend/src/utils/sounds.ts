// Звуки приложения.
// Пока для присоединения к звонку используется тот же файл, что и для
// входящего сообщения в чате; позже его можно заменить на отдельный звук.
const JOIN_SOUND_SRC = "/audio/sms.mp3";
const JOIN_SOUND_VOLUME = 0.5;

let joinSound: HTMLAudioElement | null = null;

/** Короткий звук «кто-то присоединился к звонку» */
export function playJoinSound(): void {
  if (typeof Audio === "undefined") return;

  try {
    joinSound ??= new Audio(JOIN_SOUND_SRC);
    joinSound.volume = JOIN_SOUND_VOLUME;
    joinSound.currentTime = 0;
    void joinSound.play().catch(() => {
      // Браузер может заблокировать автозапуск — звук не критичен
    });
  } catch {
    // Аудио недоступно — молча пропускаем
  }
}
