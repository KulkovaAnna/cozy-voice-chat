import { describe, expect, it } from "vitest";

import { lobbyRetryDelay } from "./lobbyRetry";

describe("lobbyRetryDelay", () => {
  it("начинает с минимальной паузы", () => {
    expect(lobbyRetryDelay(0)).toBe(3000);
  });

  it("удваивает паузу с каждой попыткой", () => {
    expect(lobbyRetryDelay(1)).toBe(6000);
  });

  it("не превышает потолок", () => {
    expect(lobbyRetryDelay(2)).toBe(10000);
    expect(lobbyRetryDelay(50)).toBe(10000);
  });

  it("нормализует отрицательные и дробные значения", () => {
    expect(lobbyRetryDelay(-3)).toBe(3000);
    expect(lobbyRetryDelay(1.9)).toBe(6000);
  });
});
