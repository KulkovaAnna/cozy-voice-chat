import styled from "@emotion/styled";

export const Block = styled.div(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.layout.small,
  textAlign: "start",
}));
