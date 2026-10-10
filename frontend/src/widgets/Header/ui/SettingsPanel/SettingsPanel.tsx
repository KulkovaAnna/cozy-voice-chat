import { useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";

import {
  BackArrowIcon,
  BurgerMenuIcon,
  ConfirmDialog,
  Delimiter,
  IconButton,
  SidePanel,
} from "@cvc/components";
import { hasUnsavedChanges, saveAllUnsavedChanges } from "@cvc/utils";
import { useTheme } from "@emotion/react";

import * as Styles from "./SettingsPanel.styles";
import { TABS } from "./constants";
import type { Tab } from "./types";

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel = (props: SettingsPanelProps) => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const activeTab = (searchParams.get("tab") as Tab) || TABS[0].id;

  const activeTabInfo = TABS.find((t) => t.id === activeTab) || TABS[0];

  const runOrAsk = (action: () => void) => {
    if (hasUnsavedChanges()) {
      setPendingAction(() => action);
      return;
    }

    action();
  };

  const selectTab = (id: Tab) => {
    setIsMenuOpen(false);

    const apply = () => {
      searchParams.set("tab", id);
      setSearchParams(searchParams);
    };

    if (id === activeTab) return;

    runOrAsk(apply);
  };

  const handleClose = () => {
    runOrAsk(() => {
      searchParams.delete("tab");
      searchParams.delete("settings");
      setSearchParams(searchParams);
      props.onClose();
    });
  };

  const handleDialogSave = async () => {
    const action = pendingAction;

    try {
      await saveAllUnsavedChanges();
    } catch {
      return;
    }

    setPendingAction(null);
    action?.();
  };

  const handleDialogDiscard = () => {
    const action = pendingAction;

    setPendingAction(null);
    action?.();
  };

  const handleDialogCancel = () => setPendingAction(null);

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
      <ConfirmDialog
        isOpen={pendingAction !== null}
        title="Несохранённые изменения"
        description="У вас есть несохранённые изменения. Сохранить их перед продолжением?"
        onDismiss={handleDialogCancel}
        actions={[
          {
            label: "Сохранить",
            variant: "primary",
            proportion: 1,
            onClick: handleDialogSave,
          },
          {
            label: "Не сохранять",
            onClick: handleDialogDiscard,
            variant: theme.colors.status.error,
            proportion: 1,
          },
          {
            label: "Отмена",
            onClick: handleDialogCancel,
            proportion: 2,
            variant: "secondary",
          },
        ]}
      />
    </Styles.Overlay>
  );
};
