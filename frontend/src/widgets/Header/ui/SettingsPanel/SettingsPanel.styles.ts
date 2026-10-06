import styled from "@emotion/styled";

export const Overlay = styled.div(({ theme }) => ({
  position: "fixed",
  inset: 0,
  zIndex: theme.zIndex.modal,
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.colors.background.paper,
  overflowY: "auto",
}));

export const Title = styled.h2(({ theme }) => ({
  margin: 0,
  color: theme.colors.text.primary,
  fontSize: theme.typography.fontSize.xl,
  display: "flex",
  alignItems: "center",
  gap: theme.spacing.unit,
  padding: theme.spacing.layout.small,
}));

export const Content = styled.div(({ theme }) => ({
  display: "flex",
  flex: 1,
  gap: theme.spacing.layout.small,
  padding: theme.spacing.layout.medium,
  boxSizing: "border-box",
  maxWidth: 1200,
  width: "100%",
  margin: "0 auto",
  [`@media screen and (max-width: ${theme.breakpoints.tablet})`]: {
    flexDirection: "column",
    maxWidth: "unset",
    padding: 0,
  },
}));

export const Nav = styled.nav(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  minWidth: "220px",
  backgroundColor: theme.colors.background.card,
  borderRadius: theme.borderRadius.medium,
  overflow: "hidden",
  [`@media screen and (max-width: ${theme.breakpoints.tablet})`]: {
    display: "none",
  },
}));

export const MobileHeader = styled.div(({ theme }) => ({
  display: "none",
  alignItems: "center",
  justifyContent: "space-between",
  gap: theme.spacing.unit,
  backgroundColor: theme.colors.background.card,
  [`@media screen and (max-width: ${theme.breakpoints.tablet})`]: {
    display: "flex",
  },
}));

export const MenuButton = styled.div(() => ({
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
  padding: "0 16px",
}));

export const SideNav = styled.nav(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.unit,
  overflowY: "auto",
}));

export const NavItem = styled.button<{ active?: boolean }>(
  ({ theme, active }) => ({
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.unit * 1.5,
    padding: `${theme.spacing.unit * 1.5}px ${theme.spacing.unit * 2}px`,
    backgroundColor: active ? theme.colors.primary.light : "transparent",
    color: active ? theme.colors.primary.contrast : theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily,
    textAlign: "left",
    cursor: "pointer",
    transition: `background-color ${theme.transitions.fast}`,
    border: "none",
    "&:hover": {
      backgroundColor: active
        ? theme.colors.primary.light
        : theme.colors.background.darker,
    },
  }),
);

export const Section = styled.section(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.layout.small,
  flex: 1,
  padding: theme.spacing.layout.small,
  backgroundColor: theme.colors.background.card,
  borderRadius: theme.borderRadius.medium,
}));

export const SectionHeader = styled.div(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: parseInt(theme.spacing.layout.small) / 4,
}));

export const SectionTitle = styled.h3(({ theme }) => ({
  margin: 0,
  color: theme.colors.text.primary,
  fontSize: theme.typography.fontSize.lg,
  textAlign: "start",
}));

export const SectionDescription = styled.p(({ theme }) => ({
  margin: 0,
  color: theme.colors.text.secondary,
  fontSize: theme.typography.fontSize.sm,
  textAlign: "start",
}));

export const BackButton = styled.button(() => ({
  padding: 0,
  border: "none",
  backgroundColor: "transparent",
  cursor: "pointer",
  color: "inherit",
}));
