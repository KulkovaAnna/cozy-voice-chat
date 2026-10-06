import {
  AccountIcon,
  MicOnIcon,
  PictureInPictureIcon,
  ThemeIcon,
} from "@cvc/components";
import {
  CustomizationTab,
  MicrophoneTab,
  PersonalizationTab,
  WindowTab,
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
    id: "window",
    label: "Интерфейс",
    description: "Настройки окон и PiP",
    Component: WindowTab,
    Icon: PictureInPictureIcon,
  },
  {
    id: "microphone",
    label: "Микрофон",
    description: "Настройки устройства ввода голоса",
    Component: MicrophoneTab,
    Icon: MicOnIcon,
  },
];
