import * as Styled from "./Card.styled";

interface CardProps {
  children?: React.ReactNode;
}

export const Card = ({ children }: CardProps) => {
  return <Styled.Card>{children}</Styled.Card>;
};
