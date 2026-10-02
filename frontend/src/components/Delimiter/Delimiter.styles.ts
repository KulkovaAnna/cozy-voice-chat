import styled from "@emotion/styled";

export const DelimiterContainer = styled.div(({ theme }) => ({
  height: "1px",
  backgroundColor: theme.colors.text.secondary,
  width: "100%",
  borderRadius: theme.borderRadius.medium,
}));
