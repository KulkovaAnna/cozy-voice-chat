import { useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";

import {
  BackArrowIcon,
  BurgerMenuIcon,
  Delimiter,
  IconButton,
  SidePanel,
} from "@cvc/components";
import { useTheme } from "@emotion/react";

import * as Styles from "./SettingsPanel.styles";
import { TABS } from "./constants";
import type { Tab } from "./types";

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel = ({ onClose }: SettingsPanelProps) => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const activeTab = (searchParams.get("tab") as Tab) || TABS[0].id;

  const activeTabInfo = TABS.find((t) => t.id === activeTab) || TABS[0];

  const selectTab = (id: Tab) => {
    searchParams.set("tab", id);
    setSearchParams(searchParams);
    setIsMenuOpen(false);
  };

  const handleClose = () => {
    searchParams.delete("tab");
    searchParams.delete("settings");
    setSearchParams(searchParams);
    onClose();
  };

  const navItems: ReactNode = TABS.map(({ id, label, Icon }) => (
    <Styles.NavItem
      key={id}
      active={activeTab === id}
      onClick={() => selectTab(id)}
    >
      <Icon />
      {label}
    </Styles.NavItem>
  ));

  return (
    <Styles.Overlay role="dialog" aria-modal="true" aria-label="Настройки">
      <Styles.Content>
        <Styles.Nav>
          <Styles.Title>
            <Styles.BackButton onClick={handleClose}>
              <BackArrowIcon />
            </Styles.BackButton>
            Настройки
          </Styles.Title>
          {navItems}
        </Styles.Nav>
        <Styles.MobileHeader>
          <Styles.Title>
            <Styles.BackButton onClick={handleClose}>
              <BackArrowIcon />
            </Styles.BackButton>
            Настройки
          </Styles.Title>
          <Styles.MenuButton>
            <IconButton
              icon={<BurgerMenuIcon />}
              aria-label="Меню настроек"
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen(true)}
            />
          </Styles.MenuButton>
        </Styles.MobileHeader>
        <Styles.Section>
          <Styles.SectionHeader>
            <Styles.SectionTitle>{activeTabInfo.label}</Styles.SectionTitle>
            <Styles.SectionDescription>
              {activeTabInfo.description}
            </Styles.SectionDescription>
          </Styles.SectionHeader>
          <Delimiter />
          <activeTabInfo.Component />
        </Styles.Section>
      </Styles.Content>
      <SidePanel
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        zIndex={theme.zIndex.modal + 1}
        noTopOffset
      >
        <Styles.SideNav>
          <Styles.Title>Настройки</Styles.Title>
          {navItems}
        </Styles.SideNav>
      </SidePanel>
    </Styles.Overlay>
  );
};
