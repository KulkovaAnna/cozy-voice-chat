import { describe, expect, it } from "vitest";

import {
  CELL_UNITS,
  getFittingColumns,
  getUserCardsGrid,
  getUserCardsLayout,
} from "./userCardsLayout";

describe("getUserCardsGrid", () => {
  it("для одного участника — сетка 1/1", () => {
    expect(getUserCardsGrid(1)).toEqual({ columns: 1, rows: 1 });
  });

  it("для двух участников — сетка 2/1", () => {
    expect(getUserCardsGrid(2)).toEqual({ columns: 2, rows: 1 });
  });

  it("для трёх и четырёх участников — сетка 2/2", () => {
    expect(getUserCardsGrid(3)).toEqual({ columns: 2, rows: 2 });
    expect(getUserCardsGrid(4)).toEqual({ columns: 2, rows: 2 });
  });

  it("для пяти и шести участников — сетка 3/2", () => {
    expect(getUserCardsGrid(5)).toEqual({ columns: 3, rows: 2 });
    expect(getUserCardsGrid(6)).toEqual({ columns: 3, rows: 2 });
  });

  it("для семи–девяти участников — сетка 3/3", () => {
    expect(getUserCardsGrid(7)).toEqual({ columns: 3, rows: 3 });
    expect(getUserCardsGrid(8)).toEqual({ columns: 3, rows: 3 });
    expect(getUserCardsGrid(9)).toEqual({ columns: 3, rows: 3 });
  });

  it("больше девяти участников — достраивает сетку 3/3 вниз", () => {
    expect(getUserCardsGrid(10)).toEqual({ columns: 3, rows: 4 });
    expect(getUserCardsGrid(12)).toEqual({ columns: 3, rows: 4 });
    expect(getUserCardsGrid(13)).toEqual({ columns: 3, rows: 5 });
  });

  it("для пустого списка остаётся минимальная сетка", () => {
    expect(getUserCardsGrid(0)).toEqual({ columns: 1, rows: 1 });
  });

  it("на узком экране сетка достраивается вниз", () => {
    expect(getUserCardsGrid(6, 2)).toEqual({ columns: 2, rows: 3 });
    expect(getUserCardsGrid(6, 1)).toEqual({ columns: 1, rows: 6 });
  });

  it("ограничение колонок не мешает маленьким группам", () => {
    expect(getUserCardsGrid(3, 2)).toEqual({ columns: 2, rows: 2 });
    expect(getUserCardsGrid(4, 2)).toEqual({ columns: 2, rows: 2 });
  });
});

describe("getFittingColumns", () => {
  it("в широкий контейнер помещаются три колонки", () => {
    expect(getFittingColumns(948, 300, 24)).toBe(3);
    expect(getFittingColumns(1920, 300, 24)).toBe(3);
  });

  it("чуть уже нужного — две колонки", () => {
    expect(getFittingColumns(947, 300, 24)).toBe(2);
    expect(getFittingColumns(624, 300, 24)).toBe(2);
  });

  it("в узкий контейнер помещается только одна колонка", () => {
    expect(getFittingColumns(623, 300, 24)).toBe(1);
    expect(getFittingColumns(320, 300, 24)).toBe(1);
    expect(getFittingColumns(0, 300, 24)).toBe(1);
  });
});

describe("getUserCardsLayout", () => {
  it("не отдаёт карточек для пустого списка", () => {
    const layout = getUserCardsLayout(0);

    expect(layout.rowSizes).toEqual([]);
    expect(layout.spans).toEqual([]);
  });

  it("одна карточка занимает всю сетку", () => {
    const layout = getUserCardsLayout(1);

    expect(layout.units).toBe(2);
    expect(layout.rowSizes).toEqual([1]);
    expect(layout.spans).toEqual([2]);
  });

  it("две карточки стоят в один ряд", () => {
    const layout = getUserCardsLayout(2);

    expect(layout.units).toBe(4);
    expect(layout.rowSizes).toEqual([2]);
    expect(layout.spans).toEqual([2, 2]);
  });

  it("третья карточка занимает всю вторую строку", () => {
    const layout = getUserCardsLayout(3);

    expect(layout.units).toBe(4);
    expect(layout.rowSizes).toEqual([2, 1]);
    expect(layout.spans).toEqual([2, 2, 4]);
  });

  it("четыре карточки заполняют сетку 2/2 без объединения ячеек", () => {
    const layout = getUserCardsLayout(4);

    expect(layout.rowSizes).toEqual([2, 2]);
    expect(layout.spans).toEqual([2, 2, 2, 2]);
  });

  it("пятая и шестая карточки делят последнюю строку сетки 3/2 пополам", () => {
    const layout = getUserCardsLayout(5);

    expect(layout.units).toBe(6);
    expect(layout.rowSizes).toEqual([3, 2]);
    expect(layout.spans).toEqual([2, 2, 2, 3, 3]);
  });

  it("шесть карточек заполняют сетку 3/2 без объединения ячеек", () => {
    const layout = getUserCardsLayout(6);

    expect(layout.rowSizes).toEqual([3, 3]);
    expect(layout.spans).toEqual([2, 2, 2, 2, 2, 2]);
  });

  it("семь карточек раскладываются как 3 + 2 + 2", () => {
    const layout = getUserCardsLayout(7);

    expect(layout.units).toBe(6);
    expect(layout.rowSizes).toEqual([3, 2, 2]);
    expect(layout.spans).toEqual([2, 2, 2, 3, 3, 3, 3]);
  });

  it("при ограничении в две колонки пять карточек идут как 2 + 2 + 1", () => {
    const layout = getUserCardsLayout(5, 2);

    expect(layout.units).toBe(4);
    expect(layout.rowSizes).toEqual([2, 2, 1]);
    expect(layout.spans).toEqual([2, 2, 2, 2, 4]);
  });

  it("каждая строка занимает ровно ширину сетки", () => {
    for (let count = 0; count <= 12; count += 1) {
      const layout = getUserCardsLayout(count);
      let index = 0;

      expect(layout.spans).toHaveLength(count);

      layout.rowSizes.forEach((size) => {
        const rowSpan = layout.spans
          .slice(index, index + size)
          .reduce((sum, span) => sum + span, 0);

        expect(rowSpan).toBe(layout.units);
        index += size;
      });
    }
  });

  it("спаны всегда целые — их можно отдать в grid-column", () => {
    for (let count = 0; count <= 12; count += 1) {
      getUserCardsLayout(count).spans.forEach((span) => {
        expect(Number.isInteger(span)).toBe(true);
      });
    }
  });

  // На CELL_UNITS опираются стили сетки: одна ячейка = CELL_UNITS полуячеек,
  // поэтому ширина полуячейки подбирается так, чтобы ячейка была 300px
  it("одна ячейка сетки состоит из CELL_UNITS полуячеек", () => {
    for (let count = 0; count <= 12; count += 1) {
      const layout = getUserCardsLayout(count);

      expect(layout.units / layout.grid.columns).toBe(CELL_UNITS);
    }
  });
});
