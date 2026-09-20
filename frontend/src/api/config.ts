const protocol = import.meta.env.VITE_SSL === "true" ? "https" : "http";

export const API_URLS = {
  BASE_URL: `${protocol}://${import.meta.env.VITE_HOST_IP}:${import.meta.env.VITE_PORT}`,
};
