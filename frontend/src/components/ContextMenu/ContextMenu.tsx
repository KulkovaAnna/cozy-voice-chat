import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MenuContainer, TriggerContainter } from "./ContextMenu.styles"; // ваши стили
import { useClickOutside } from "../../hooks/useClickOutside";

interface ContextMenuProps {
  children: React.ReactNode;
  menu: React.ReactNode;
  id?: string;
  isShow: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  children,
  menu,
  id = "custom-context-menu",
  isShow,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const { visible, openMenu, closeMenu } = useClickOutside(id);
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    openMenu();
  };
  const handlePreventDefault = (e: React.MouseEvent) => e.preventDefault();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && visible) closeMenu();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visible]);

  return (
    <>
      <TriggerContainter onContextMenu={handleContextMenu}>
        {children}
      </TriggerContainter>

      {isShow &&
        visible &&
        createPortal(
          <MenuContainer
            id={id}
            x={position.x}
            y={position.y}
            onContextMenu={handlePreventDefault}
          >
            {menu}
          </MenuContainer>,
          document.body,
        )}
    </>
  );
};
