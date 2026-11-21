import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearActiveCall, readActiveCall, saveActiveCall } from "./activeRoom";

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
    saveActiveCall("call-1", "ab12cd");

    expect(readActiveCall()).toEqual({
      callId: "call-1",
      roomCode: "AB12CD",
    });
  });

  it("сохраняет 1-на-1 без кода", () => {
    saveActiveCall("call-1");

    expect(readActiveCall()).toEqual({
      callId: "call-1",
      roomCode: null,
    });
  });

  it("не сохраняет неверный код комнаты, но помнит звонок", () => {
    saveActiveCall("call-1", "bad");

    expect(readActiveCall()).toEqual({
      callId: "call-1",
      roomCode: null,
    });
  });

  it("читает старый формат без кода", () => {
    storage.set("cvc:active-room", JSON.stringify({ callId: "call-1" }));

    expect(readActiveCall()).toEqual({
      callId: "call-1",
      roomCode: null,
    });
  });

  it("игнорирует повреждённые данные", () => {
    storage.set("cvc:active-room", "not json");

    expect(readActiveCall()).toBeNull();
  });

  it("очищает сохранённый звонок", () => {
    saveActiveCall("call-1", "AB12CD");
    clearActiveCall();

    expect(readActiveCall()).toBeNull();
  });
});