import * as Styles from "./Card.styles";

interface CardProps {
  hasGlow?: boolean;
  children?: React.ReactNode;
  className?: string;
  direction?: "row" | "column";
}

export const Card = ({
  hasGlow = false,
  children,
  direction = "row",
  ...props
}: CardProps) => {
  return (
    <Styles.Card $direction={direction} $hasGlow={hasGlow} {...props}>
      {children}
    </Styles.Card>
  );
};
