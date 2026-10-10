import type { CSSProperties, ReactNode } from "react";
import * as Styles from "./Card.styles";

interface CardProps {
  hasGlow?: boolean;
  children?: ReactNode;
  className?: string;
  direction?: "row" | "column";
  style?: CSSProperties;
}

export const Card = (props: CardProps) => {
  const { hasGlow = false, children, direction = "row", ...rest } = props;
  return (
    <Styles.Card $direction={direction} $hasGlow={hasGlow} {...rest}>
      {children}
    </Styles.Card>
  );
};
