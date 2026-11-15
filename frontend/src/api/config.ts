const protocol = import.meta.env.VITE_SSL === "true" ? "https" : "http";

/**
 * Хост backend и PeerJS-сервера.
 *
 * Берём адрес, по которому открыто приложение: участник из локальной сети или
 * из VPN (Radmin VPN / Hamachi) заходит по IP хоста в своей сети, и клиент
 * автоматически обращается к серверам на этом же адресе. Поэтому один и тот же
 * билд работает и в LAN, и через VPN — без пересборки под каждый адрес.
 *
 * Если хост открыл приложение через localhost/127.0.0.1, такой адрес на других
 * машинах недоступен — подставляем VITE_HOST_IP из конфигурации (та же логика,
 * что в getRoomShareOrigin из utils/roomCode).
 */
export function getBackendHost(): string {
  const configuredHost: string = import.meta.env.VITE_HOST_IP;

  if (typeof window === "undefined") return configuredHost;

  const { hostname } = window.location;
  const isLocal =
    !hostname ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1";

  return isLocal ? configuredHost : hostname;
}

export const API_URLS = {
  BASE_URL: `${protocol}://${getBackendHost()}:${import.meta.env.VITE_PORT}`,
};
