import type { IconProps } from "./types";

export const InstallAppIcon = (props: IconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="24px"
      viewBox="0 0 24 24"
      width="24px"
      fill={props.color || "currentColor"}
    >
      <path d="M11 3h2v8h3l-4 4-4-4h3z" />
      <path d="M4 16h16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
    </svg>
  );
};
