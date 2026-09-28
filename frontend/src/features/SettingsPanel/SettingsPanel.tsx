import { useState } from "react";
import * as Styled from "./SettingsPanel.styled";
import { TABS } from "./constants";
import type { Tab } from "./types";
import { BackArrowIcon } from "../../components/Icons";

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel = ({ onClose }: SettingsPanelProps) => {
  const [activeTab, setActiveTab] = useState<Tab>(TABS[0].id);

  const activeTabInfo = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <Styled.Overlay role="dialog" aria-modal="true" aria-label="Настройки">
      <Styled.Content>
        <Styled.Nav>
          <Styled.Title>
            <Styled.BackButton onClick={onClose}>
              <BackArrowIcon />
            </Styled.BackButton>
            Настройки
          </Styled.Title>
          {TABS.map(({ id, label, Icon }) => (
            <Styled.NavItem
              key={id}
              active={activeTab === id}
              onClick={() => setActiveTab(id)}
            >
              <Icon />
              {label}
            </Styled.NavItem>
          ))}
        </Styled.Nav>
        <Styled.Section>
          <Styled.SectionHeader>
            <Styled.SectionTitle>{activeTabInfo.label}</Styled.SectionTitle>
            <Styled.SectionDescription>
              {activeTabInfo.description}
            </Styled.SectionDescription>
          </Styled.SectionHeader>
          <Styled.Delimiter />
          <activeTabInfo.Component />
        </Styled.Section>
      </Styled.Content>
    </Styled.Overlay>
  );
};
