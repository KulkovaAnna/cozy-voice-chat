import { forwardRef, type ForwardedRef, type InputHTMLAttributes } from "react";
import * as Styles from "./Input.styles";

type InputProps = InputHTMLAttributes<HTMLInputElement> &
  InputHTMLAttributes<HTMLTextAreaElement> & {
    isTextarea?: boolean;
  };

export const Input = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  InputProps
>((props, ref) => {
  const { isTextarea, ...rest } = props;
  return isTextarea ? (
    <Styles.Textarea ref={ref as ForwardedRef<HTMLTextAreaElement>} {...rest} />
  ) : (
    <Styles.Input ref={ref as ForwardedRef<HTMLInputElement>} {...rest} />
  );
});
