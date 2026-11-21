import type { ReactNode } from "react";

import * as Styles from "./TopLeftCorner.styles";

interface TopLeftCornerProps {
  children: ReactNode;
}

export const TopLeftCorner = (props: TopLeftCornerProps) => (
  <Styles.Corner>{props.children}</Styles.Corner>
);
