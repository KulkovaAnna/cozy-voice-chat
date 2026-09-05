import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { HorizontalSlider } from "../Slider";
import { MenuContainer, MenuLabel } from "./ContextMenu.styles";

interface ContextMenuProps {
  children: React.ReactNode;
  value: number | undefined;
  onChange: ((val: number) => void) | undefined;
}

export const ContextMenuWithSlider: React.FC<ContextMenuProps> = ({
  children,
  value,
  onChange = () => {},
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setMenuVisible(true);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuVisible) {
        const menuElement = document.getElementById("custom-context-menu");
        if (menuElement && !menuElement.contains(e.target as Node)) {
          setMenuVisible(false);
        }
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [menuVisible]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuVisible) setMenuVisible(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuVisible]);

  const handleMenuClick = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        style={{ display: "inline-block" }}
      >
        {children}
      </div>

      {value != null &&
        menuVisible &&
        createPortal(
          <MenuContainer
            id="custom-context-menu"
            x={position.x}
            y={position.y}
            onClick={handleMenuClick}
            onContextMenu={(e) => e.preventDefault()}
          >
            <MenuLabel>Громкость</MenuLabel>
            <HorizontalSlider
              value={value}
              onChange={onChange}
              thumbSize={20}
            />
          </MenuContainer>,
          document.body,
        )}
    </>
  );
};
