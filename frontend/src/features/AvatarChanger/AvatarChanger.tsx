import { IconButton, Input, SaveIcon } from "@cvc/components";
import { useAuth } from "@cvc/providers";
import { useForm } from "react-hook-form";
import * as Styled from "./AvatarChanger.styled";

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
