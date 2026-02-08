import { useTheme } from "@emotion/react";
import type { IconProps } from "./types";

export const ThemeIcon = ({ color, state }: IconProps) => {
  const theme = useTheme();
  if (state) {
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9.5 4C13.91 4 17.5 7.59 17.5 12C17.5 16.41 13.91 20 9.5 20C9.16 20 8.82 19.98 8.49 19.93C10.4 17.77 11.5 14.95 11.5 12C11.5 9.05 10.4 6.23 8.49 4.07C8.82 4.02 9.16 4 9.5 4ZM9.5 2C7.68 2 5.97 2.5 4.5 3.35C7.49 5.08 9.5 8.3 9.5 12C9.5 15.7 7.49 18.92 4.5 20.65C5.97 21.5 7.68 22 9.5 22C15.02 22 19.5 17.52 19.5 12C19.5 6.48 15.02 2 9.5 2Z"
          fill={color || theme.colors.primary.contrast}
        />
      </svg>
    );
  } else {
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z"
          fill={color || theme.colors.primary.contrast}
        />
      </svg>
    );
  }
};
