import * as Styled from "./Form.styled";

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children?: React.ReactNode;
}

export const Form = ({ children, ...props }: FormProps) => {
  return <Styled.Form {...props}>{children}</Styled.Form>;
};
