import styled from "@emotion/styled";

/** Общий правый верхний угол под шапкой: кнопка комнаты и копирование ссылки */
export const Corner = styled.div(({ theme }) => ({
  position: "fixed",
  top: "4.5rem",
  right: "1rem",
  zIndex: 9,
  [`@media screen and (max-width: ${theme.breakpoints.mobile})`]: {
    top: "4rem",
    right: "0.75rem",
  },
}));