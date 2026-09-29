export type Tab = "customization" | "personalization";

export interface TabConfig {
  id: Tab;
  label: string;
  description?: string;
  Component: React.ComponentType;
  Icon: React.ComponentType;
}
