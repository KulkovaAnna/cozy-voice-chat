import * as Styled from "./Card.styled";

interface CardProps {
  hasGlow?: boolean;
  children?: React.ReactNode;
  className?: string;
  direction?: "row" | "column";
}

export const Card = ({
  hasGlow = false,
  children,
  direction = "row",
  ...props
}: CardProps) => {
  return (
    <Styled.Card $direction={direction} $hasGlow={hasGlow} {...props}>
      {children}
    </Styled.Card>
  );
};
