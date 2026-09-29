import styled from "@emotion/styled";

export const ControlPanel = styled.div<{ compact?: boolean }>(
  ({ theme, compact }) => ({
    position: "fixed",
    bottom: "2rem",
    display: "flex",
    flexFlow: "row",
    backgroundColor: theme.colors.background.card,
    border: "none",
    borderRadius: "6px",
    justifyContent: "center",
    alignItems: "center",
    gap: "1rem",
    padding: theme.spacing.layout.small,
    height: "100%",
    maxHeight: "70px",
    width: "fit-content",
    boxSizing: "border-box",
    transform: `scale(${compact ? 0.8 : 1})`,
  }),
);
