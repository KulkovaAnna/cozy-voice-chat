/**
 * Раскладка сетки карточек участников звонка.
 *
 * Допустимые сетки (колонки × строки): 1/1, 2/1, 2/2, 3/2, 3/3.
 * Если участников не хватает на ровную сетку, карточки занимают несколько
 * ячеек подряд: последняя строка растягивается на всю ширину.
 * Например, 3 участника в сетке 2/2 — третья карточка во всю строку,
 * 5 участников в сетке 3/2 — две последние по 1.5 ячейки.
 */

export type UserCardsGrid = {
  /** Колонок в сетке */
  columns: number;
  /** Строк в сетке */
  rows: number;
};

/** Допустимые сетки карточек в порядке роста */
export const USER_CARDS_GRIDS: readonly UserCardsGrid[] = [
  { columns: 1, rows: 1 },
  { columns: 2, rows: 1 },
  { columns: 2, rows: 2 },
  { columns: 3, rows: 2 },
  { columns: 3, rows: 3 },
];

export type UserCardsLayout = {
  /** Выбранная сетка */
  grid: UserCardsGrid;
  /**
   * Колонок в CSS-grid — вдвое больше, чем в раскладке: карточка шириной
   * в полторы ячейки занимает 3 из 6 «полуячеек».
   */
  units: number;
  /** Сколько карточек в каждой строке (сверху вниз) */
  rowSizes: number[];
  /** Сколько полуячеек занимает каждая карточка (в порядке участников) */
  spans: number[];
};

/** Минимальная сетка: одна карточка на всю ширину */
const SINGLE_CELL_GRID: UserCardsGrid = { columns: 1, rows: 1 };

/** Сколько полуячеек приходится на одну ячейку раскладки */
export const CELL_UNITS = 2;

/** Максимум колонок среди допустимых сеток */
export const MAX_CARD_COLUMNS = USER_CARDS_GRIDS.reduce(
  (max, { columns }) => Math.max(max, columns),
  1,
);

/**
 * Сколько колонок карточек влезает в доступную ширину, не сжимая карточки.
 * Ширина карточки и отступ между ними — в пикселях.
 */
export function getFittingColumns(
  width: number,
  cardWidth: number,
  gap: number,
): number {
  for (let columns = MAX_CARD_COLUMNS; columns > 1; columns -= 1) {
    if (columns * cardWidth + (columns - 1) * gap <= width) return columns;
  }

  return 1;
}

/**
 * Подбирает наименьшую допустимую сетку, вмещающую всех участников.
 * `maxColumns` ограничивает число колонок (например, на узком экране).
 * Если сетка не вмещает участников, она достраивается вниз.
 */
export function getUserCardsGrid(
  count: number,
  maxColumns: number = MAX_CARD_COLUMNS,
): UserCardsGrid {
  if (count <= 1) return SINGLE_CELL_GRID;

  const columnsLimit = Math.max(1, Math.min(maxColumns, MAX_CARD_COLUMNS));
  const allowed = USER_CARDS_GRIDS.filter(
    ({ columns }) => columns <= columnsLimit,
  );
  const fitting = allowed.find(({ columns, rows }) => columns * rows >= count);
  if (fitting) return fitting;

  const widest = allowed[allowed.length - 1] ?? SINGLE_CELL_GRID;
  return {
    columns: widest.columns,
    rows: Math.ceil(count / widest.columns),
  };
}

/**
 * Считает раскладку карточек: сколько карточек в каждой строке и сколько
 * ячеек занимает каждая карточка. Строки заполняются по возможности
 * равномерно, поэтому неполная строка растягивается на всю ширину.
 */
export function getUserCardsLayout(
  count: number,
  maxColumns: number = MAX_CARD_COLUMNS,
): UserCardsLayout {
  const grid = getUserCardsGrid(count, maxColumns);
  const units = grid.columns * CELL_UNITS;
  const rowSizes: number[] = [];
  let remaining = Math.max(count, 0);

  for (let row = 0; row < grid.rows && remaining > 0; row += 1) {
    const rowsLeft = grid.rows - row;
    const size = Math.min(grid.columns, Math.ceil(remaining / rowsLeft));

    rowSizes.push(size);
    remaining -= size;
  }

  const spans = rowSizes.flatMap((size) =>
    Array.from({ length: size }, () => units / size),
  );

  return { grid, units, rowSizes, spans };
}
