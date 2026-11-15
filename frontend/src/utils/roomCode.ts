/** Код комнаты: 6 символов A-Z0-9 */
const ROOM_CODE_PATTERN = /^[A-Z0-9]{6}$/;

/** Приводит код к виду, в котором его хранит сервер */
export function normalizeRoomCode(value: string): string {
  // Поддерживаем вставку полной ссылки: .../join/ABC123
  const fromLink = value.match(/\/join\/([A-Za-z0-9]{6})/i);

  return (fromLink?.[1] ?? value).trim().toUpperCase();
}

/** Проверяет формат кода комнаты */
export function isValidRoomCode(value: string): boolean {
  return ROOM_CODE_PATTERN.test(normalizeRoomCode(value));
}

/**
 * Origin для ссылки-приглашения.
 * Если хост открыл приложение через localhost, такая ссылка не откроется
 * у других машин — подменяем хост на VITE_HOST_IP из конфигурации.
 */
export function getRoomShareOrigin(): string {
  const { protocol, hostname, port, origin } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  const configuredHost = import.meta.env.VITE_HOST_IP;

  if (!isLocal || !configuredHost) return origin;

  return `${protocol}//${configuredHost}${port ? `:${port}` : ""}`;
}
