import type { HTMLAttributes, PropsWithChildren } from "react";
import * as Styles from "./Row.styles";

interface RowProps extends HTMLAttributes<HTMLDivElement> {
  withScroll?: boolean;
}

export const Row = (props: PropsWithChildren<RowProps>) => {
  const { withScroll, ...rest } = props;
  return (
    <Styles.Row $withScroll={withScroll} {...rest}>
      {props.children}
    </Styles.Row>
  );
};
