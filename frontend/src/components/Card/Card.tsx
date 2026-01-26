import * as Styled from "./Card.styled";

interface CardProps {
  children?: React.ReactNode;
}

export const Card = ({ children, ...props }: CardProps) => {
  return <Styled.Card {...props}>{children}</Styled.Card>;
};
