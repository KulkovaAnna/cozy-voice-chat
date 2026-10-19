import type { IconProps } from "./types";

export const SkipNextIcon = (props: IconProps) => {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"
        fill={props.color || "currentColor"}
      />
    </svg>
  );
};
