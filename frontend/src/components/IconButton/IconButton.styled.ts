import styled from "@emotion/styled";

export const IconButton = styled.button(({ theme }) => ({
  color: theme.colors.primary.contrast,
  backgroundColor: theme?.colors.primary.main,
  border: "none",
  borderRadius: "4px",
  padding: "8px",
  minWidth: "45px",
  maxWidth: "200px",
  height: "45px",
  fontSize: "1rem",
  "&:hover": {
    cursor: "pointer",
    backgroundColor: theme.colors.primary.dark,
  },
}));
