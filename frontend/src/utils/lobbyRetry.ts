// Минимальная пауза перед повторной попыткой войти в лобби.
const LOBBY_RETRY_MIN_DELAY_MS = 3_000;
// Потолок паузы между попытками: дальше ждём по 10 секунд.
const LOBBY_RETRY_MAX_DELAY_MS = 10_000;

/**
 * Задержка перед очередной попыткой `lobby::join`.
 * Повторы идут по уже открытому WebSocket, поэтому лимит подключений
 * на IP не расходуется.
 */
export function lobbyRetryDelay(attempt: number): number {
  const index = Math.max(0, Math.floor(attempt));

  return Math.min(
    LOBBY_RETRY_MIN_DELAY_MS * 2 ** index,
    LOBBY_RETRY_MAX_DELAY_MS,
  );
}
