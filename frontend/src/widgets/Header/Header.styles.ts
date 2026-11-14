import styled from "@emotion/styled";

interface AvatarProps {
  size: number;
}

export const Header = styled.div(({ theme }) => ({
  position: "fixed",
  top: 0,
  left: 0,
  zIndex: 10,
  display: "flex",
  flexFlow: "row",
  alignItems: "center",
  backgroundColor: theme.colors.background.card,
  justifyContent: "space-between",
  gap: "2rem",
  padding: "0.5rem 1rem",
  width: "100%",
  boxSizing: "border-box",
  boxShadow: `0px 2px 8px ${theme.colors.primary.dark}`,
}));

export const RightPanel = styled.div`
  display: flex;
  flex-flow: row;
  justify-content: right;
  align-items: center;
  width: fit-content;
  flex-shrink: 0;
  gap: 1rem;
`;

export const InvisibleButton = styled.button<AvatarProps>(
  ({ size, theme }) => ({
    width: `${size}px`,
    height: `${size}px`,
    background: "none",
    border: "none",
    borderRadius: "50%",
    backgroundColor: theme.colors.secondary.main,
    "&:hover": {
      cursor: "pointer",
    },
  }),
);

export const SiteLogo = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 4px;

  img {
    flex-shrink: 0;
  }

  /* Заголовок всегда в одну строку: иначе он переносится и раздувает
     фиксированную шапку. При нехватке места обрезается эллипсисом. */
  h1 {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  /* На мобильных места для названия нет — оставляем только иконку. */
  @media screen and (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    h1 {
      display: none;
    }
  }
`;
