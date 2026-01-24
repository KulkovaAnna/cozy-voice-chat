import styled from "@emotion/styled";

interface ColumnProps {
  align?: "flex-start" | "center" | "flex-end";
  hasLine?: boolean;
}

export const Column = styled.div<ColumnProps>(
  ({ theme, hasLine = false, align = "flex-start" }) => ({
    display: "flex",
    flexFlow: "column",
    justifyContent: align,
    alignItems: "center",
    gap: "2rem",
    border: `4px solid transparent`,
    borderLeftColor: hasLine ? theme.colors.background.paper : "none",
    borderRadius: "4px",
    padding: "2rem",
    width: "100%",
    boxSizing: "border-box",
  }),
);
