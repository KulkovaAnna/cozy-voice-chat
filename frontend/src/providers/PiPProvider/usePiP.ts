import { useContext } from "react";
import { PiPContext } from "./PiPContext";

export function usePiP() {
  return useContext(PiPContext);
}
