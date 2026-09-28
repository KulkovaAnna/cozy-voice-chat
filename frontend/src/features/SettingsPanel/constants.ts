import { AccountIcon, ThemeIcon } from "@cvc/components/Icons";
import { CustomizationTab, PersonalizationTab } from "./components";
import type { TabConfig } from "./types";

export const TABS: TabConfig[] = [
  {
    id: "personalization",
    label: "Профиль",
    description: "Настройки вашего профиля",
    Component: PersonalizationTab,
    Icon: AccountIcon,
  },
  {
    id: "customization",
    label: "Кастомизация",
    description: "Кастомизация вашего приложения",
    Component: CustomizationTab,
    Icon: ThemeIcon,
  },
];
