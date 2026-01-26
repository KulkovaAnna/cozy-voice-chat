import { useForm } from "react-hook-form";
import { Form } from "../../components/Form";
import { useAuth } from "../../providers/AuthProvider";
import { Column } from "../../components/Column";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";

export const EnterUserNameForm = () => {
  const { userName, setUserName } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  return (
    !userName && (
      <Form
        onSubmit={handleSubmit((data) => {
          setUserName(data.userName);
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
    )
  );
};
