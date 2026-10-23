// Вспомогательная обёртка над Notification API и setAppBadge.
// Не зависит от React: вызывается из хуков/провайдеров.

/** Запрашивает разрешение на push-уведомления. Возвращает текущий статус. */
export async function requestNotificationPermission(): Promise<
  "denied" | "granted" | "default"
> {
  if (!("Notification" in window)) return "denied";

  const current = Notification.permission;
  if (current === "granted") return current;
  if (current === "default") {
    try {
      const result = await Notification.requestPermission();
      return result;
    } catch {
      // Браузер блокирует requestPermission без user-жеста (Firefox, некоторые режимы).
      return "denied";
    }
  }
  return current;
}

/** Показывает системное уведомление о входящем звонке. */
export function notifyIncomingCall(name: string): void {
  if (Notification.permission !== "granted") return;
  try {
    new Notification("Входящий звонок", {
      body: `${name} вызывает вас`,
      icon: "/icons/icon-512.png",
      tag: "incoming-call",
      requireInteraction: true, // остаётся на экране до нажатия
    });
  } catch {
    // Браузер отклонил показ (например, не-secure context).
  }
}

/** Устанавливает счётчик непрочитанных на значок приложения. */
export function setAppBadge(count: number): void {
  if (!("setAppBadge" in navigator)) return;
  try {
    (
      navigator as Navigator & { setAppBadge: (n?: number) => void }
    ).setAppBadge(Math.max(0, Math.min(count, 999)));
  } catch {
    // Не поддерживается (Safari, Firefox).
  }
}

/** Очищает счётчик на значке приложения. */
export function clearAppBadge(): void {
  setAppBadge(0);
}
