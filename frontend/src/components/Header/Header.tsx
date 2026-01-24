import * as Styled from "./Header.styled";

interface HeaderProps {
  children?: React.ReactNode;
}

export const Header = ({ children }: HeaderProps) => {
  return <Styled.Header>{children}</Styled.Header>;
};
