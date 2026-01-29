import { EditableNickname } from "../../components/EditableNickname";
import { IconButton } from "../../components/IconButton";
import { Icons } from "../../components/IconButton/constants";
import { Row } from "../../components/Row";
import { useThemeColor } from "../../providers/ThemeColorProvider";
import { AvatarChanger } from "../AvatarChanger";
import * as Styled from "./UserMenu.styled";

export const UserMenu = () => {
  const { isDarkMode, setIsDarkMode } = useThemeColor();
  return (
    <Styled.UserMenu hasGlow>
      <EditableNickname />
      <AvatarChanger />
      <Row>
        <Styled.Label>Сменить тему</Styled.Label>{" "}
        <IconButton
          icon={isDarkMode ? Icons.lightTheme : Icons.darkTheme}
          onClick={() => setIsDarkMode((prev) => (prev ? "" : "true"))}
        ></IconButton>
      </Row>
    </Styled.UserMenu>
  );
};
