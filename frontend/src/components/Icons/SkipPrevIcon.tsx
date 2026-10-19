import type { IconProps } from "./types";

export const SkipPrevIcon = (props: IconProps) => {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 6h2v12H6V6Zm3.5 6 8.5 6V6l-8.5 6Z"
        fill={props.color || "currentColor"}
      />
    </svg>
  );
};
