import type { ReactNode } from "react";

import * as Styles from "./TopRightCorner.styles";

interface TopRightCornerProps {
  children: ReactNode;
}

export const TopRightCorner = (props: TopRightCornerProps) => (
  <Styles.Corner>{props.children}</Styles.Corner>
);