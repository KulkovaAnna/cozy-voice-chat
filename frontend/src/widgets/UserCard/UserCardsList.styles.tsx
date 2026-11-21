import { Row } from "@cvc/components";
import type { Theme } from "@cvc/theme";
import { CELL_UNITS } from "@cvc/utils";
import styled from "@emotion/styled";
import { USER_CARD_WIDTH } from "./constants";

interface GridProps {
  /** Колонок в CSS-grid: вдвое больше колонок раскладки (полуячейки) */
  $units: number;
}

/**
 * Ширина полуячейки: одна ячейка (span 2) вместе с отступами должна быть
 * ровно шириной стандартной карточки. Тогда карточка в одной ячейке остаётся
 * прежних 300px, а объединённая растёт пропорционально — 1.5 ячейки ≈ 450px,
 * 2 ячейки ≈ 600px (две карточки и отступ между ними).
 */
function gridUnitWidth(theme: Theme): number {
  const gap = parseInt(theme.spacing.layout.medium);

  return (USER_CARD_WIDTH - gap) / CELL_UNITS;
}

/** Сетка карточек для групповой комнаты */
export const Grid = styled.div<GridProps>(({ $units, theme }) => ({
  display: "grid",
  // Колонки не растягиваются шире полуячейки: карточки сохраняют привычный
  // размер, а сетка центрируется. На узких экранах колонки сжимаются.
  gridTemplateColumns: `repeat(${$units}, minmax(0, ${gridUnitWidth(theme)}px))`,
  justifyContent: "center",
  gridAutoRows: "minmax(0, auto)",
  alignItems: "stretch",
  gap: theme.spacing.layout.medium,
  width: "100%",
  boxSizing: "border-box",
}));

interface CellProps {
  /** Сколько полуячеек занимает карточка; `undefined` — карточка вне сетки */
  $span?: number;
}

/** Ячейка сетки: карточка может занимать несколько ячеек подряд */
export const Cell = styled.div<CellProps>(({ $span, theme }) => ({
  maxWidth: "100%",
  // Ширину ограничиваем только в сетке: в компактной строке с прокруткой
  // карточки должны сохранять свою ширину, а не сжиматься
  ...($span != null && { minWidth: 0, gridColumn: `span ${$span}` }),
  // На мобильных сетка в одну колонку — карточка занимает всю строку
  [`@media screen and (max-width: ${theme.breakpoints.mobile})`]: {
    gridColumn: "1 / -1",
  },
}));

export const StyledRow = styled(Row)(({ theme }) => ({
  maxWidth: "100vw",
  paddingInline: theme.spacing.layout.small,
}));
