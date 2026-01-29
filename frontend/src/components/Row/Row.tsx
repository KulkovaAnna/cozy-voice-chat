import type { PropsWithChildren } from "react";
import * as Styled from "./Row.styled";

export const Row = ({ children }: PropsWithChildren) => {
  return <Styled.Row>{children}</Styled.Row>;
};
