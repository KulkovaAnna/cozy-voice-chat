import "@emotion/react";
import { AppTheme } from "./theme";

// Расширяем дефолтную тему Emotion
declare module "@emotion/react" {
  export interface Theme extends AppTheme {}
}
