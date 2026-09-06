import styled from "@emotion/styled";

export const Container = styled.div<{ $topOffset?: number; $isOpen?: boolean }>`
  position: fixed;
  right: ${({ $isOpen }) => ($isOpen ? 0 : "-100%")};
  top: 0;
  padding: ${({ theme }) => theme.spacing.layout.small};
  background-color: ${({ theme }) => theme.colors.background.paper};
  height: 100%;
  padding-top: ${({ $topOffset = 0, theme }) => $topOffset + parseInt(theme.spacing.layout.large)}px;
  width: 100%;
  max-width: 375px;
  transition: ${({ theme }) => theme.transitions.fast} linear all;

  @media screen and (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    max-width: unset;
  }
`;

export const CloseButton = styled.button<{ $topOffset?: number }>`
  position: absolute;
  right: 0;
  top: ${({ $topOffset = 0 }) => $topOffset}px;
  background: transparent !important;
  border: none;
  padding: 8px;
  display: none;

  @media screen and (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: block;
  }
`;
