import * as Styles from "./Form.styles";

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children?: React.ReactNode;
}

export const Form = (props: FormProps) => {
  const { children, ...rest } = props;
  return <Styles.Form {...rest}>{children}</Styles.Form>;
};
