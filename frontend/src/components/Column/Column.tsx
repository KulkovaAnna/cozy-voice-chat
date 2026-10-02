import * as Styles from "./Column.styles";

interface ColumnProps {
  align?: "flex-start" | "center" | "flex-end";
  hasLine?: boolean;
  children?: React.ReactNode;
}

export const Column = ({ align, hasLine, children }: ColumnProps) => {
  return (
    <Styles.Column align={align} hasLine={hasLine}>
      {children}
    </Styles.Column>
  );
};
