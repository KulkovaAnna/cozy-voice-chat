import styled from "@emotion/styled";
import { Card } from "../../components/Card";

export const StyledCard = styled(Card)<{ $compact?: boolean }>(
  ({ $compact }) => ({
    ...($compact && {
      padding: 0,
      background: "none",
    }),
  }),
);
