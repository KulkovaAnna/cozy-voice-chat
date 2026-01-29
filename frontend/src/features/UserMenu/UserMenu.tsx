import { Button } from "../../components/Button";
import { EditableNickname } from "../../components/EditableNickname";
import { Icons } from "../../components/IconButton/constants";
import { useThemeColor } from "../../providers/ThemeColorProvider";
import { AvatarChanger } from "../AvatarChanger";
import * as Styled from "./UserMenu.styled";

export const UserMenu = () => {
  const { isDarkMode, setIsDarkMode } = useThemeColor();
  return (
    <Styled.UserMenu hasGlow>
      <EditableNickname />
      <AvatarChanger />
      <Button
        isPrimary
        onClick={() => setIsDarkMode((prev) => (prev ? "" : "true"))}
      >
        Сменить тему {isDarkMode ? Icons.lightTheme : Icons.darkTheme}
      </Button>
    </Styled.UserMenu>
  );
};
