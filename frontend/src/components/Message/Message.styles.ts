import styled from "@emotion/styled";

type AnglePosition = "left" | "right";

type AngleProps = { $anglePosition: AnglePosition };

export const Container = styled.div<AngleProps>`
  display: flex;
  gap: 4px;
  flex-direction: ${({ $anglePosition }) => ($anglePosition === "right" ? "row-reverse" : "row")};
`;

export const MessageBody = styled.div<AngleProps>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: ${({ $anglePosition }) => ($anglePosition === "right" ? "flex-end" : "flex-start")};
`;

export const Name = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const MessageBubble = styled.div<AngleProps>(
  ({ $anglePosition, theme }) => `
  background-color: ${theme.colors.background.card};
  padding: 8px;
  span {
    font-size: 14px;
  }
  border-radius: ${$anglePosition === "left" ? 0 : "8px"} ${$anglePosition === "right" ? 0 : "8px"} 8px 8px;
`,
);
