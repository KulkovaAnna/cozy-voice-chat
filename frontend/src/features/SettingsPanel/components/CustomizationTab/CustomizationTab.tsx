import { useThemeColor } from "../../../../providers/ThemeColorProvider";
import { IconButton } from "../../../../components/IconButton";
import { MoonIcon, SunIcon } from "../../../../components/Icons";
import * as Styled from "./CustomizationTab.styles";

export const CustomizationTab = () => {
  const { isDarkMode, setIsDarkMode } = useThemeColor();
  const switchTheme = () => {
    setIsDarkMode((prev) => (prev ? "" : "true"));
  };

  return (
    <>
      <Styled.Block>
        <h4>Тема: {isDarkMode ? "Темная" : "Светлая"}</h4>
        <IconButton
          icon={isDarkMode ? <MoonIcon /> : <SunIcon />}
          onClick={switchTheme}
          aria-label="Переключить тему"
        />
      </Styled.Block>
    </>
  );
};
