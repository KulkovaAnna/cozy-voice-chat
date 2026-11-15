import styled from "@emotion/styled";
import { Avatar, Card } from "@cvc/components";
import { cardImageLayerStyles } from "@cvc/utils";

export const Container = styled(Card)(({ theme }) => ({
  ...cardImageLayerStyles,
  boxShadow: `0px 0px 4px 2px ${theme.colors.primary.dark}`,
  padding: "0.5rem 1rem",
  width: "100vw",
  maxWidth: "300px",
  justifyContent: "space-between",
  gap: "1rem",
}));

// Аватар — flex-item внутри строки с длинным именем: без явного запрета
// сжатия img «плющится» по ширине и вместо круга получается овал.
export const RowAvatar = styled(Avatar)({
  flexShrink: 0,
});

export const InnerContainer = styled.div({
  display: "flex",
  flexFlow: "row",
  alignItems: "center",
  justifyContent: "flex-start",
  // Занимает всё свободное место, но может ужиматься — иначе кнопка звонка
  // выталкивается за пределы карточки.
  flex: "1 1 auto",
  minWidth: 0,
  gap: "1rem",
  overflow: "hidden",
  whiteSpace: "nowrap",
});

export const Label = styled.p({
  display: "block",
  flexShrink: 0,
  whiteSpace: "nowrap",
});

export const LabelEllipsis = styled(Label)({
  flex: "1 1 auto",
  // Без min-width: 0 flex-item не даёт ужать себя меньше содержимого,
  // поэтому text-overflow не срабатывает.
  minWidth: 0,
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
});
