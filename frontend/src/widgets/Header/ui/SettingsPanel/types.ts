export type Tab = "customization" | "microphone" | "personalization" | "window";

export interface TabConfig {
  id: Tab;
  label: string;
  description?: string;
  Component: React.ComponentType;
  Icon: React.ComponentType;
}
