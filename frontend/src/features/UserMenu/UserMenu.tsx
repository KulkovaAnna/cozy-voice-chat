import {
  EditableNickname,
  IconButton,
  MoonIcon,
  Row,
  SunIcon,
} from "@cvc/components";
import { useThemeColor } from "@cvc/providers";
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
          icon={isDarkMode ? <MoonIcon /> : <SunIcon />}
          onClick={() => setIsDarkMode((prev) => (prev ? "" : "true"))}
        ></IconButton>
      </Row>
    </Styled.UserMenu>
  );
};
