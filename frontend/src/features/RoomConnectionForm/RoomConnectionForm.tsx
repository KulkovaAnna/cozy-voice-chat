import { useForm } from "react-hook-form";
import { Button } from "../../components/Button";
import { Form } from "../../components/Form";
import { Column } from "../../components/Column";
import { Input } from "../../components/Input";
import { useAuth } from "../../providers/AuthProvider";
import { useNavigate } from "react-router";

export const RoomConnectionForm = () => {
  const { userName } = useAuth();
  const { register, handleSubmit } = useForm();
  const navigate = useNavigate();

  return (
    userName && (
      <Form
        onSubmit={handleSubmit((data) => {
          navigate(`/room/${data.roomCode}`);
        })}
      >
        <Column align="center">
          <Input placeholder="Код комнаты" {...register("roomCode")} />
          <Button type={"submit"} isPrimary>
            Присоединиться
          </Button>
        </Column>
        <Column align="center" hasLine>
          <Button>Создать</Button>
        </Column>
      </Form>
    )
  );
};
