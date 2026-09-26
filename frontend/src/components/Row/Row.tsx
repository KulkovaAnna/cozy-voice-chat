import type { PropsWithChildren } from "react";
import * as Styled from "./Row.styled";

interface RowProps {
  withScroll?: boolean;
}

export const Row = ({ children, withScroll }: PropsWithChildren<RowProps>) => {
  return <Styled.Row $withScroll={withScroll}>{children}</Styled.Row>;
};
