import { Delimiter, IconButton, MoonIcon, SunIcon } from "@cvc/components";
import { CardCustomization } from "@cvc/features";
import { useThemeColor } from "@cvc/providers";
import { Section } from "../Section";

export const CustomizationTab = () => {
  const { isDarkMode, setIsDarkMode } = useThemeColor();
  const switchTheme = () => {
    setIsDarkMode((prev) => (prev ? "" : "true"));
  };

  return (
    <>
      <Section title={`Тема: ${isDarkMode ? "Темная" : "Светлая"}`}>
        <IconButton
          icon={isDarkMode ? <MoonIcon /> : <SunIcon />}
          onClick={switchTheme}
          aria-label="Переключить тему"
        />
      </Section>

      <Delimiter />

      <Section title="Карточка пользователя">
        <CardCustomization />
      </Section>
    </>
  );
};
