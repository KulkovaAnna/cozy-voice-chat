import * as Styles from "./Form.styles";

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children?: React.ReactNode;
}

export const Form = ({ children, ...props }: FormProps) => {
  return <Styles.Form {...props}>{children}</Styles.Form>;
};
