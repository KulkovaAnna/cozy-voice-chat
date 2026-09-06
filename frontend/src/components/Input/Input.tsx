import { forwardRef, type ForwardedRef, type InputHTMLAttributes } from "react";
import * as Styled from "./Input.styled";

type InputProps = InputHTMLAttributes<HTMLInputElement> &
  InputHTMLAttributes<HTMLTextAreaElement> & {
    isTextarea?: boolean;
  };

export const Input = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  InputProps
>(({ isTextarea, ...props }, ref) => {
  return isTextarea ? (
    <Styled.Textarea
      ref={ref as ForwardedRef<HTMLTextAreaElement>}
      {...props}
    />
  ) : (
    <Styled.Input ref={ref as ForwardedRef<HTMLInputElement>} {...props} />
  );
});
