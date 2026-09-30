import { AccountIcon, MicOnIcon, ThemeIcon } from "@cvc/components";
import {
  CustomizationTab,
  MicrophoneTab,
  PersonalizationTab,
} from "./components";
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
  {
    id: "microphone",
    label: "Микрофон",
    description: "Настройки устройства ввода голоса",
    Component: MicrophoneTab,
    Icon: MicOnIcon,
  },
];
