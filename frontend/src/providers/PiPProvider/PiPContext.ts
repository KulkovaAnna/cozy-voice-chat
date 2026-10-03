import { createContext } from "react";

export type PiPContextType = {
  isSupported: boolean;
  isOpen: boolean;
  pipWindow: Window | null;
  open: VoidFunction;
  openAuto: VoidFunction;
  close: VoidFunction;
};

export const PiPContext = createContext<PiPContextType>({
  isSupported: false,
  isOpen: false,
  pipWindow: null,
  open: () => {},
  openAuto: () => {},
  close: () => {},
});
