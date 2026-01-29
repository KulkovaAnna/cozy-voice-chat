import * as Styled from "./Card.styled";

interface CardProps {
  hasGlow?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const Card = ({ hasGlow = false, children, ...props }: CardProps) => {
  return (
    <Styled.Card hasGlow={hasGlow} {...props}>
      {children}
    </Styled.Card>
  );
};
