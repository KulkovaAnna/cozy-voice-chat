import { Button, Column, Form, Input } from "@cvc/components";
import { useAuth } from "@cvc/providers";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";

interface EnterUserNameFormProps {
  /** Куда вернуться после ввода имени (например, /join/ABC123) */
  redirectTo?: string;
}

export const EnterUserNameForm = (props: EnterUserNameFormProps) => {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  return (
    <Form
      onSubmit={handleSubmit((data) => {
        updateUser({ name: data.userName });
        navigate(props.redirectTo ?? "/");
      })}
    >
      <Column align="center">
        <p>Представьтесь, пожалуйста!</p>
        <Input
          placeholder="Ваш никнейм"
          {...register("userName", { required: true })}
        />
        {errors.userName && (
          <p>Никнейм обязателен для регистрации соединения.</p>
        )}
        <Button type="submit" variant="primary">
          Далее
        </Button>
      </Column>
    </Form>
  );
};
