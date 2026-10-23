import styled from "@emotion/styled";

export const InstallButton = styled.button(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  height: "40px",
  padding: "0 12px",
  borderRadius: theme.borderRadius.medium,
  border: `1px solid ${theme.colors.primary.main}`,
  backgroundColor: "transparent",
  color: theme.colors.primary.main,
  fontFamily: theme.typography.fontFamily,
  fontSize: theme.typography.fontSize.sm,
  whiteSpace: "nowrap",
  transition: "0.2s ease all",
  "&:hover": {
    cursor: "pointer",
    backgroundColor: theme.colors.primary.main,
    color: theme.colors.primary.contrast,
  },
}));

export const UpdateToast = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const UpdateButton = styled.button(({ theme }) => ({
  height: "28px",
  padding: "0 10px",
  borderRadius: theme.borderRadius.small,
  border: "none",
  backgroundColor: theme.colors.primary.main,
  color: theme.colors.primary.contrast,
  fontFamily: theme.typography.fontFamily,
  fontSize: theme.typography.fontSize.xs,
  whiteSpace: "nowrap",
  transition: "0.2s ease all",
  "&:hover": {
    cursor: "pointer",
    backgroundColor: theme.colors.primary.dark,
  },
}));
