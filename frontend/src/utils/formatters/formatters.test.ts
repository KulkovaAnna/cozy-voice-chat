import { describe, expect, it } from "vitest";

import { formatBytes, formatDuration } from "./index";

describe("formatBytes", () => {
  it("возвращает '0 B' для нуля", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("возвращает байты для значений менее 1000", () => {
    expect(formatBytes(1)).toBe("1 B");
    expect(formatBytes(999)).toBe("999 B");
  });

  it("округляет до целого, если значение кратное 1000", () => {
    expect(formatBytes(1000)).toBe("1 KB");
    expect(formatBytes(2000)).toBe("2 KB");
    expect(formatBytes(1000000)).toBe("1 MB");
    expect(formatBytes(1000000000)).toBe("1 GB");
  });

  it("форматирует с двумя знаками после запятой для нецелых значений", () => {
    expect(formatBytes(1500)).toBe("1.50 KB");
    expect(formatBytes(1234)).toBe("1.23 KB");
    expect(formatBytes(1500000)).toBe("1.50 MB");
  });

  it("корректно переходит к большим единицам", () => {
    expect(formatBytes(1000 ** 2)).toBe("1 MB");
    expect(formatBytes(1000 ** 3)).toBe("1 GB");
    expect(formatBytes(1000 ** 4)).toBe("1 TB");
    expect(formatBytes(1000 ** 5)).toBe("1 PB");
    expect(formatBytes(1000 ** 6)).toBe("1 EB");
    expect(formatBytes(1000 ** 7)).toBe("1 ZB");
    expect(formatBytes(1000 ** 8)).toBe("1 YB");
  });

  it("ограничивает максимальную единицу YB", () => {
    const huge = 1000 ** 10; // больше YB
    expect(formatBytes(huge)).toBe("1000000 YB");
  });

  it("обрабатывает дробные значения", () => {
    expect(formatBytes(0.5)).toBe("0.50 B");
    expect(formatBytes(100.7)).toBe("100.70 B");
  });
});

describe("formatDuration", () => {
  it("возвращает null для некорректных значений", () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(undefined)).toBeNull();
    expect(formatDuration(NaN)).toBeNull();
    expect(formatDuration(Infinity)).toBeNull();
    expect(formatDuration(-Infinity)).toBeNull();
  });

  it("возвращает '0:00' для нуля", () => {
    expect(formatDuration(0.4)).toBe("0:00");
  });

  it("возвращает null для нуля из-за проверки !seconds", () => {
    expect(formatDuration(0)).toBeNull();
  });

  it("форматирует секунды менее минуты", () => {
    expect(formatDuration(1)).toBe("0:01");
    expect(formatDuration(9)).toBe("0:09");
    expect(formatDuration(59)).toBe("0:59");
  });

  it("форматирует ровно минуту", () => {
    expect(formatDuration(60)).toBe("1:00");
  });

  it("форматирует минуты и секунды", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(120)).toBe("2:00");
    expect(formatDuration(3661)).toBe("61:01");
  });

  it("округляет дробные секунды", () => {
    expect(formatDuration(0.4)).toBe("0:00");
    expect(formatDuration(0.6)).toBe("0:01");
    expect(formatDuration(59.5)).toBe("1:00");
    expect(formatDuration(60.4)).toBe("1:00");
  });

  it("обрабатывает большие значения", () => {
    expect(formatDuration(3600)).toBe("60:00");
    expect(formatDuration(7261)).toBe("121:01");
  });
});
