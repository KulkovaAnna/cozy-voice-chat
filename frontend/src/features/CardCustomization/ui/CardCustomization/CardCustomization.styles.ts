import styled from "@emotion/styled";

export const Container = styled.div(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.layout.small,
  textAlign: "start",
}));

export const Controls = styled.div(({ theme }) => ({
  display: "flex",
  gap: theme.spacing.layout.small,

  [`@media screen and (max-width: ${theme.breakpoints.tablet})`]: {
    flexDirection: "column",
  },
}));

export const SaveRow = styled.div({
  display: "flex",
  justifyContent: "flex-end",
});

export const ControlsColumn = styled.div(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.unit,
  flex: 0.5,
}));
