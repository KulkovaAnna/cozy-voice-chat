import type { PropsWithChildren } from "react";

import * as Styles from "./Section.styles";

interface SectionProps {
  title?: string;
}

export function Section(props: PropsWithChildren<SectionProps>) {
  return (
    <Styles.Container>
      {props.title && <Styles.Title>{props.title}</Styles.Title>}
      {props.children}
    </Styles.Container>
  );
}
