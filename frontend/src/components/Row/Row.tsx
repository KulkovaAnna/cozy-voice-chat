import type { PropsWithChildren } from "react";
import * as Styles from "./Row.styles";

interface RowProps {
  withScroll?: boolean;
}

export const Row = (props: PropsWithChildren<RowProps>) => {
  return (
    <Styles.Row $withScroll={props.withScroll}>{props.children}</Styles.Row>
  );
};
