import { useForm } from "react-hook-form";
import { Form } from "../../components/Form";
import { useAuth } from "../../providers/AuthProvider";
import { Column } from "../../components/Column";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { useNavigate } from "react-router";

export const EnterUserNameForm = () => {
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
        navigate("/");
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
        <Button type={"submit"} isPrimary>
          Далее
        </Button>
      </Column>
    </Form>
  );
};
