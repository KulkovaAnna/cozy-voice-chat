export type Tab = "customization" | "microphone" | "personalization";

export interface TabConfig {
  id: Tab;
  label: string;
  description?: string;
  Component: React.ComponentType;
  Icon: React.ComponentType;
}
