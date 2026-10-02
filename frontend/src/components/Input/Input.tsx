import { forwardRef, type ForwardedRef, type InputHTMLAttributes } from "react";
import * as Styles from "./Input.styles";

type InputProps = InputHTMLAttributes<HTMLInputElement> &
  InputHTMLAttributes<HTMLTextAreaElement> & {
    isTextarea?: boolean;
  };

export const Input = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  InputProps
>(({ isTextarea, ...props }, ref) => {
  return isTextarea ? (
    <Styles.Textarea
      ref={ref as ForwardedRef<HTMLTextAreaElement>}
      {...props}
    />
  ) : (
    <Styles.Input ref={ref as ForwardedRef<HTMLInputElement>} {...props} />
  );
});
