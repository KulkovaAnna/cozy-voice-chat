import * as Styles from "./Card.styles";

interface CardProps {
  hasGlow?: boolean;
  children?: React.ReactNode;
  className?: string;
  direction?: "row" | "column";
}

export const Card = (props: CardProps) => {
  const { hasGlow = false, children, direction = "row", ...rest } = props;
  return (
    <Styles.Card $direction={direction} $hasGlow={hasGlow} {...rest}>
      {children}
    </Styles.Card>
  );
};
