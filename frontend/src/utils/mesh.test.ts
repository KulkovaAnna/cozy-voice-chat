import { describe, expect, it } from "vitest";

import { diffPeerIds, shouldInitiateConnection } from "./mesh";

describe("shouldInitiateConnection", () => {
  it("инициирует соединение только участник с меньшим id", () => {
    expect(shouldInitiateConnection("a", "b")).toBe(true);
    expect(shouldInitiateConnection("b", "a")).toBe(false);
  });

  it("гарантирует ровно одного инициатора на пару", () => {
    const first = "11111111-1111-1111-1111-111111111111";
    const second = "22222222-2222-2222-2222-222222222222";

    expect(shouldInitiateConnection(first, second)).toBe(true);
    expect(shouldInitiateConnection(second, first)).toBe(false);
  });

  it("не инициирует соединение с самим собой", () => {
    expect(shouldInitiateConnection("same", "same")).toBe(false);
  });
});

describe("diffPeerIds", () => {
  it("находит новых и вышедших участников", () => {
    const result = diffPeerIds(["a", "b"], ["b", "c"]);

    expect(result.added).toEqual(["c"]);
    expect(result.removed).toEqual(["a"]);
  });

  it("не возвращает изменений для одинаковых наборов", () => {
    const result = diffPeerIds(["a", "b"], ["b", "a"]);

    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
  });

  it("корректно работает с пустыми наборами", () => {
    expect(diffPeerIds([], ["a"]).added).toEqual(["a"]);
    expect(diffPeerIds(["a"], []).removed).toEqual(["a"]);
  });
});
