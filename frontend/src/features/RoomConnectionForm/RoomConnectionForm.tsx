import { useForm } from "react-hook-form";
import { Button } from "../../components/Button";
import { Form } from "../../components/Form";
import { Column } from "../../components/Column";
import { Input } from "../../components/Input";
import { useAuth } from "../../providers/AuthProvider";
import { useNavigate } from "react-router";
import { useChatNetwork } from "../../providers/ChatNetworkProvider";
import { useEffect } from "react";

interface FormData {
  roomCode: string;
}

export const RoomConnectionForm = () => {
  const { createRoom, roomId, joinToRoom, roomJoined, setRoomId } =
    useChatNetwork();

  const { userName } = useAuth();
  const { register, handleSubmit } = useForm<FormData>();
  const navigate = useNavigate();

  const joinToRoomByCode = (data: FormData) => {
    setRoomId(data.roomCode);
  };

  useEffect(() => {
    if (roomId) {
      joinToRoom({
        userName,
        something: "Random stuff",
      });
    }
  }, [roomId]);

  useEffect(() => {
    if (roomJoined) {
      navigate(`/room/${roomId}`);
    }
  }, [roomJoined]);

  return (
    userName && (
      <Form onSubmit={handleSubmit(joinToRoomByCode)}>
        <Column align="center">
          <Input
            placeholder="Код комнаты"
            {...register("roomCode", { required: true })}
          />
          <Button type={"submit"} isPrimary>
            Присоединиться
          </Button>
        </Column>
        <Column align="center" hasLine>
          <Button type="button" onClick={createRoom}>
            Создать
          </Button>
        </Column>
      </Form>
    )
  );
};
