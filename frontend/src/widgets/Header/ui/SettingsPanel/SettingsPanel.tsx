import { useState, type ReactNode } from "react";

import {
  BackArrowIcon,
  BurgerMenuIcon,
  IconButton,
  SidePanel,
} from "@cvc/components";
import { useTheme } from "@emotion/react";

import * as Styled from "./SettingsPanel.styled";
import { TABS } from "./constants";
import type { Tab } from "./types";

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel = ({ onClose }: SettingsPanelProps) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>(TABS[0].id);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const activeTabInfo = TABS.find((t) => t.id === activeTab) || TABS[0];

  const selectTab = (id: Tab) => {
    setActiveTab(id);
    setIsMenuOpen(false);
  };

  const navItems: ReactNode = TABS.map(({ id, label, Icon }) => (
    <Styled.NavItem
      key={id}
      active={activeTab === id}
      onClick={() => selectTab(id)}
    >
      <Icon />
      {label}
    </Styled.NavItem>
  ));

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
          {navItems}
        </Styled.Nav>
        <Styled.MobileHeader>
          <Styled.Title>
            <Styled.BackButton onClick={onClose}>
              <BackArrowIcon />
            </Styled.BackButton>
            Настройки
          </Styled.Title>
          <Styled.MenuButton>
            <IconButton
              icon={<BurgerMenuIcon />}
              aria-label="Меню настроек"
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen(true)}
            />
          </Styled.MenuButton>
        </Styled.MobileHeader>
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
      <SidePanel
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        zIndex={theme.zIndex.modal + 1}
        noTopOffset
      >
        <Styled.SideNav>
          <Styled.Title>Настройки</Styled.Title>
          {navItems}
        </Styled.SideNav>
      </SidePanel>
    </Styled.Overlay>
  );
};
