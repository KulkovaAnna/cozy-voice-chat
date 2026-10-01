import { IconButton, MoonIcon, SunIcon } from "@cvc/components";
import { useThemeColor } from "@cvc/providers";
import { Section } from "../Section";

export const CustomizationTab = () => {
  const { isDarkMode, setIsDarkMode } = useThemeColor();
  const switchTheme = () => {
    setIsDarkMode((prev) => (prev ? "" : "true"));
  };

  return (
    <Section title={`Тема: ${isDarkMode ? "Темная" : "Светлая"}`}>
      <IconButton
        icon={isDarkMode ? <MoonIcon /> : <SunIcon />}
        onClick={switchTheme}
        aria-label="Переключить тему"
      />
    </Section>
  );
};
