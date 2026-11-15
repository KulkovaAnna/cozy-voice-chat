import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearActiveRoom, readActiveRoom, saveActiveRoom } from "./activeRoom";

const storage = new Map<string, string>();

const sessionStorageMock = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
  removeItem: vi.fn((key: string) => storage.delete(key)),
};

describe("activeRoom", () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
    vi.stubGlobal("sessionStorage", sessionStorageMock);
  });

  it("сохраняет и читает активную комнату", () => {
    saveActiveRoom("call-1", "ab12cd");

    expect(readActiveRoom()).toEqual({
      callId: "call-1",
      roomCode: "AB12CD",
    });
  });

  it("не сохраняет комнату с неверным кодом", () => {
    saveActiveRoom("call-1", "bad");

    expect(readActiveRoom()).toBeNull();
  });

  it("игнорирует повреждённые данные", () => {
    storage.set("cvc:active-room", "not json");

    expect(readActiveRoom()).toBeNull();
  });

  it("очищает сохранённую комнату", () => {
    saveActiveRoom("call-1", "AB12CD");
    clearActiveRoom();

    expect(readActiveRoom()).toBeNull();
  });
});