import { describe, expect, it } from "vitest";

import { isValidRoomCode, normalizeRoomCode } from "./roomCode";

describe("normalizeRoomCode", () => {
  it("убирает пробелы и приводит к верхнему регистру", () => {
    expect(normalizeRoomCode("  ab12cd ")).toBe("AB12CD");
  });

  it("извлекает код из ссылки-приглашения", () => {
    expect(normalizeRoomCode("https://192.168.1.2:5173/join/ab12cd")).toBe(
      "AB12CD",
    );
  });
});

describe("isValidRoomCode", () => {
  it("принимает код из 6 символов A-Z0-9", () => {
    expect(isValidRoomCode("ABC123")).toBe(true);
    expect(isValidRoomCode(" abc123 ")).toBe(true);
  });

  it("отклоняет код неверной длины", () => {
    expect(isValidRoomCode("ABC12")).toBe(false);
    expect(isValidRoomCode("ABC1234")).toBe(false);
    expect(isValidRoomCode("")).toBe(false);
  });

  it("отклоняет недопустимые символы", () => {
    expect(isValidRoomCode("ABC-12")).toBe(false);
    expect(isValidRoomCode("АБВ123")).toBe(false);
  });
});
