import styled from "@emotion/styled";
import { Avatar, Card } from "@cvc/components";
import { cardImageLayerStyles } from "@cvc/utils";

export const Header = styled.div({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
});

export const Title = styled.h2({
  margin: 0,
});

export const Empty = styled.p(({ theme }) => ({
  margin: 0,
  color: theme.colors.text.secondary,
}));

export const List = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0.5rem",
  maxHeight: "60vh",
  overflowY: "auto",
  paddingRight: "4px",
});

// Строка повторяет карточку участника из лобби: фон, рамка аватара и текст.
export const Row = styled(Card)(({ theme }) => ({
  ...cardImageLayerStyles,
  boxShadow: `0px 0px 4px 2px ${theme.colors.primary.dark}`,
  padding: "0.5rem 1rem",
  width: "100%",
  maxWidth: "300px",
  boxSizing: "border-box",
  justifyContent: "space-between",
  gap: "1rem",
}));

export const MemberInfo = styled.div({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  flex: "1 1 auto",
  minWidth: 0,
  gap: "1rem",
  overflow: "hidden",
  whiteSpace: "nowrap",
});

// Аватар — flex-item: без запрета сжатия img превращается в овал
export const RowAvatar = styled(Avatar)({
  flexShrink: 0,
});

export const Name = styled.p({
  flex: "1 1 auto",
  minWidth: 0,
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
