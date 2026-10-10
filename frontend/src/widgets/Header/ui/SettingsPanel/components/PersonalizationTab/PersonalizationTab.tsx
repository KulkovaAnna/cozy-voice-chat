import { EditableNickname } from "@cvc/features";
import { Section } from "../Section";

export const PersonalizationTab = () => {
  return (
    <Section title="Имя">
      <EditableNickname />
    </Section>
  );
};
