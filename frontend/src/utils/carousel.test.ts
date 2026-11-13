import { describe, expect, it } from "vitest";

import { wrapIndex } from "./carousel";

describe("wrapIndex", () => {
  it("оставляет индекс внутри списка без изменений", () => {
    expect(wrapIndex(0, 3)).toBe(0);
    expect(wrapIndex(2, 3)).toBe(2);
  });

  it("зацикливает навигацию в обе стороны", () => {
    expect(wrapIndex(-1, 3)).toBe(2);
    expect(wrapIndex(3, 3)).toBe(0);
    expect(wrapIndex(7, 3)).toBe(1);
  });

  it("возвращает 0 для пустого списка", () => {
    expect(wrapIndex(0, 0)).toBe(0);
    expect(wrapIndex(5, 0)).toBe(0);
    expect(wrapIndex(-2, 0)).toBe(0);
  });
});
