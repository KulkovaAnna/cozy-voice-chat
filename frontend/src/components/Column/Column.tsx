import * as Styled from "./Column.styled";

interface ColumnProps {
  align?: "flex-start" | "center" | "flex-end";
  hasLine?: boolean;
  children?: React.ReactNode;
}

export const Column = ({ align, hasLine, children }: ColumnProps) => {
  return (
    <Styled.Column align={align} hasLine={hasLine}>
      {children}
    </Styled.Column>
  );
};
