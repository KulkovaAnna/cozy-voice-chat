import type { Theme } from "@cvc/theme";
import styled from "@emotion/styled";
import { FileInfo } from "../FileInfo";

type AnglePosition = "left" | "right";

type AngleProps = { $anglePosition: AnglePosition };

type SystemProps = { $isSystem?: boolean };

export const Container = styled.div<AngleProps>`
  display: flex;
  gap: 4px;
  max-width: 100%;
  min-width: 0;
  flex-direction: ${({ $anglePosition }) => ($anglePosition === "right" ? "row-reverse" : "row")};
`;

export const MessageBody = styled.div<AngleProps>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 100%;
  min-width: 0;
  align-items: ${({ $anglePosition }) => ($anglePosition === "right" ? "flex-end" : "flex-start")};
`;

export const Name = styled.span<SystemProps>`
  font-size: 12px;
  color: ${({ theme, $isSystem }) => ($isSystem ? theme.colors.primary.main : theme.colors.text.secondary)};
`;

export const MessageBubble = styled.div<AngleProps & SystemProps>(
  ({ $anglePosition, theme, $isSystem }) => `
  background-color: ${theme.colors.background.card};
  padding: 8px;
  font-size: 14px;
  max-width: 100%;
  border-radius: ${$anglePosition === "left" ? 0 : "8px"} ${$anglePosition === "right" ? 0 : "8px"} 8px 8px;
  word-wrap: anywhere;

  * {
    word-wrap: anywhere;
  }
    ${$isSystem ? `border: 1px solid ${theme.colors.primary.main}` : ""}
`,
);

export const StyledFileInfo = styled(FileInfo)`
  width: calc(100% - ${({ theme }) => theme.spacing.layout.small});
  * a {
    cursor: pointer;
  }
`;

/** Блок вложений под текстом сообщения */
export const Attachments = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
`;

/** Общее оформление кликабельной картинки: кнопка, чтобы работали Enter/Space */
const imageButtonStyles = (theme: Theme) => ({
  display: "block",
  padding: 0,
  border: "none",
  borderRadius: theme.borderRadius.small,
  overflow: "hidden",
  background: "none",
  cursor: "zoom-in",
  "&:focus-visible": {
    outline: `2px solid ${theme.colors.primary.main}`,
    outlineOffset: 2,
  },
});

/** Сетка миниатюр: до трёх квадратов в ряд, лишние переносятся на новую строку */
export const ImageGrid = styled.div<{ $columns: number }>(
  ({ theme, $columns }) => ({
    display: "grid",
    gridTemplateColumns: `repeat(${$columns}, 72px)`,
    gap: 4,
    justifyContent: "flex-start",

    [`@media screen and (max-width: ${theme.breakpoints.mobile})`]: {
      gridTemplateColumns: `repeat(${$columns}, 64px)`,
    },
  }),
);

/** Квадратная миниатюра в сетке */
export const ThumbButton = styled.button(({ theme }) => ({
  ...imageButtonStyles(theme),
  width: 72,
  height: 72,

  [`@media screen and (max-width: ${theme.breakpoints.mobile})`]: {
    width: 64,
    height: 64,
  },
}));

/** Единственная картинка в сообщении — превью привычного размера */
export const PreviewButton = styled.button(({ theme }) => ({
  ...imageButtonStyles(theme),
  width: "fit-content",
  maxWidth: "100%",
}));

export const ThumbImage = styled.img({
  display: "block",
  width: "100%",
  height: "100%",
  objectFit: "cover",
});

export const PreviewImage = styled.img({
  display: "block",
  maxWidth: "100%",
  maxHeight: 200,
  objectFit: "cover",
  userSelect: "none",
});
