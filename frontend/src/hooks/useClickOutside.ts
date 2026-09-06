import { useEffect, useState } from "react";

export function useClickOutside(id: string) {
  const [visible, setVisible] = useState(false);

  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (visible) {
        const menuElement = document.getElementById(id);
        if (menuElement && !menuElement.contains(e.target as Node)) {
          closeMenu();
        }
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [visible, id]);

  return { visible, openMenu, closeMenu };
}
