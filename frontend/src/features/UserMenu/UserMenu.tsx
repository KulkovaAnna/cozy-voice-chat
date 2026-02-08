import { EditableNickname } from "../../components/EditableNickname";
import { Row } from "../../components/Row";
import { useThemeColor } from "../../providers/ThemeColorProvider";
import { AvatarChanger } from "../AvatarChanger";
import * as Styled from "./UserMenu.styled";
import { IconButton } from "../../components/IconButton";
import { MoonIcon, SunIcon } from "../../components/Icons";

export const UserMenu = () => {
  const { isDarkMode, setIsDarkMode } = useThemeColor();
  return (
    <Styled.UserMenu hasGlow>
      <EditableNickname />
      <AvatarChanger />
      <Row>
        <Styled.Label>Сменить тему</Styled.Label>{" "}
        <IconButton
          icon={isDarkMode ? <MoonIcon /> : <SunIcon />}
          onClick={() => setIsDarkMode((prev) => (prev ? "" : "true"))}
        ></IconButton>
      </Row>
    </Styled.UserMenu>
  );
};
