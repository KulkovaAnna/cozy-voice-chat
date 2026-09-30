import styled from "@emotion/styled";

export const Root = styled.div({
  position: "relative",
  width: "100%",
});

export const Trigger = styled.button<{ $open: boolean }>(({ theme }) => ({
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: theme.spacing.unit,
  padding: `${theme.spacing.unit}px ${theme.spacing.unit * 1.5}px`,
  background: theme.colors.background.paper,
  color: theme.colors.text.primary,
  border: "none",
  borderRadius: theme.borderRadius.medium,
  fontFamily: theme.typography.fontFamily,
  fontSize: theme.typography.fontSize.sm,
  textAlign: "start",
  cursor: "pointer",
  transition: `background ${theme.transitions.fast}`,
  outline: "none",

  "&:hover:not(:disabled)": {
    background: theme.colors.background.darker,
  },

  "&:focus-visible": {
    boxShadow: `0 0 0 2px ${theme.colors.background.paper}, 0 0 0 4px ${theme.colors.primary.main}`,
  },

  "&:disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
  },
}));

export const Value = styled.span(({ theme }) => ({
  flex: 1,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  color: theme.colors.text.primary,
}));

export const Placeholder = styled(Value)(({ theme }) => ({
  color: theme.colors.text.secondary,
}));

export const ChevronWrap = styled.span<{ $open: boolean }>(
  ({ theme, $open }) => ({
    display: "inline-flex",
    flexShrink: 0,
    transition: `transform ${theme.transitions.fast}`,
    transform: `rotate(${$open ? 0 : 180}deg)`,
  }),
);

export const Options = styled.div<{ $open: boolean }>(({ theme, $open }) => ({
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  zIndex: theme.zIndex.tooltip,
  margin: 0,
  padding: `${theme.spacing.unit}px 0`,
  listStyle: "none",
  maxHeight: 240,
  overflowY: "auto",
  background: theme.colors.background.card,
  border: `1px solid ${theme.colors.background.darker}`,
  borderRadius: theme.borderRadius.medium,
  boxShadow: theme.shadows.medium,
  opacity: $open ? 1 : 0,
  visibility: $open ? "visible" : "hidden",
  transform: `translateY(${$open ? 0 : -4}px)`,
  transition: `opacity ${theme.transitions.fast}, transform ${theme.transitions.fast}, visibility ${theme.transitions.fast}`,
}));

export const Option = styled.div<{ $active: boolean; $selected: boolean }>(
  ({ theme, $active, $selected }) => ({
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.unit,
    padding: `${theme.spacing.unit}px ${theme.spacing.unit * 1.5}px`,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    cursor: "pointer",
    userSelect: "none",
    fontWeight: $selected
      ? theme.typography.fontWeight.medium
      : theme.typography.fontWeight.regular,
    background: $active ? theme.colors.background.darker : "transparent",
    transition: `background ${theme.transitions.fast}`,

    "&:hover": {
      background: theme.colors.background.darker,
    },
  }),
);

export const Group = styled.div({
  listStyle: "none",
});

export const GroupLabel = styled.div(({ theme }) => ({
  padding: `${theme.spacing.unit}px ${theme.spacing.unit * 1.5}px`,
  fontSize: theme.typography.fontSize.xs,
  fontWeight: theme.typography.fontWeight.medium,
  color: theme.colors.text.secondary,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
}));
