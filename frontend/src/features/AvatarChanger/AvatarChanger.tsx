import { useForm } from "react-hook-form";
import { IconButton } from "../../components/IconButton";
import { Input } from "../../components/Input";
import { useAuth } from "../../providers/AuthProvider";
import * as Styled from "./AvatarChanger.styled";
import { SaveIcon } from "../../components/Icons";

interface FormData {
  avatar: string;
}

export const AvatarChanger = () => {
  const { updateUser } = useAuth();
  const { handleSubmit, register, setValue } = useForm<FormData>();
  const submit = (data: FormData) => {
    updateUser({ avatar: data.avatar });
    setValue("avatar", "");
  };

  return (
    <Styled.FormRow onSubmit={handleSubmit(submit)}>
      <Input
        placeholder="Новый URL аватара..."
        {...register("avatar", { required: true })}
      />
      <IconButton icon={<SaveIcon />} type="submit" />
    </Styled.FormRow>
  );
};
