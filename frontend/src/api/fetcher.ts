import { API_URLS } from "./config";

export const fetcher = (input: string, init?: RequestInit) => {
  return fetch(`${API_URLS.BASE_URL}${input}`, init);
};
