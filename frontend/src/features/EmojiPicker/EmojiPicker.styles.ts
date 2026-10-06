import styled from "@emotion/styled";

export const Wrapper = styled.div`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  position: relative;
`;

export const Popover = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  z-index: 100;

  /* Мобильная раскладка: пикер поверх всей клавиатуры — позиционируем по верхнему краю. */
  @media (max-width: 768px) {
    position: fixed;
    top: calc(max(8px, env(safe-area-inset-top)) + 60px);
    left: 50%;
    bottom: auto;
    transform: translateX(-50%);
    margin-bottom: 0;
    max-width: calc(100vw - 16px);
    max-height: calc(100vh - 16px - env(safe-area-inset-top));
    overflow: auto;
  }
`;
