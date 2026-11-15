import styled from "@emotion/styled";

/** Левый верхний угол под шапкой: управление комнатой в звонке */
export const Corner = styled.div(({ theme }) => ({
  position: "fixed",
  top: "4.5rem",
  left: "1rem",
  zIndex: 9,
  [`@media screen and (max-width: ${theme.breakpoints.mobile})`]: {
    top: "4rem",
    left: "0.75rem",
  },
}));
