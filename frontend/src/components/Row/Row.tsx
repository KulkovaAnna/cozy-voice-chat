import type { PropsWithChildren } from "react";
import * as Styles from "./Row.styles";

interface RowProps {
  withScroll?: boolean;
}

export const Row = ({ children, withScroll }: PropsWithChildren<RowProps>) => {
  return <Styles.Row $withScroll={withScroll}>{children}</Styles.Row>;
};
