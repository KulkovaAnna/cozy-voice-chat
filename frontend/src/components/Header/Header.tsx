import { IconButton } from "../IconButton";
import { Icons } from "../IconButton/constants";
import * as Styled from "./Header.styled";

interface HeaderProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const Header = ({ isDarkMode, toggleTheme }: HeaderProps) => {
  return (
    <Styled.Header>
      <h1>Cozy Voice Chat</h1>
      <IconButton
        icon={isDarkMode ? Icons.lightTheme : Icons.darkTheme}
        onClick={toggleTheme}
      />
    </Styled.Header>
  );
};
