import * as Styles from "./Column.styles";

interface ColumnProps {
  align?: "flex-start" | "center" | "flex-end";
  hasLine?: boolean;
  children?: React.ReactNode;
}

export const Column = (props: ColumnProps) => {
  return (
    <Styles.Column align={props.align} hasLine={props.hasLine}>
      {props.children}
    </Styles.Column>
  );
};
