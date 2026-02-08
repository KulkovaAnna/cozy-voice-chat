import { useTheme } from "@emotion/react";
import type { IconProps } from "./types";

export const SaveIcon = ({ color, state }: IconProps) => {
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
          d="M17 3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V7L17 3ZM19 19H5V5H16.17L19 7.83V19ZM12 12C10.34 12 9 13.34 9 15C9 16.66 10.34 18 12 18C13.66 18 15 16.66 15 15C15 13.34 13.66 12 12 12ZM6 6H15V10H6V6Z"
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
          d="M2.99875 21.0015H6.74875L17.8087 9.94152L14.0587 6.19152L2.99875 17.2515V21.0015ZM4.99875 18.0815L14.0587 9.02152L14.9787 9.94152L5.91875 19.0015H4.99875V18.0815Z"
          fill={color || theme.colors.primary.contrast}
        />
        <path
          d="M18.3687 3.29152C17.9787 2.90152 17.3487 2.90152 16.9587 3.29152L15.1287 5.12152L18.8787 8.87152L20.7087 7.04152C21.0987 6.65152 21.0987 6.02152 20.7087 5.63152L18.3687 3.29152Z"
          fill={color || theme.colors.primary.contrast}
        />
      </svg>
    );
  }
};
