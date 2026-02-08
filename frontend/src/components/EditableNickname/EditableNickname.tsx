import { useEffect, useState, type InputHTMLAttributes } from "react";
import * as Styled from "./EditableNickname.styled";
import { IconButton } from "../IconButton";
import { useForm } from "react-hook-form";
import { useAuth } from "../../providers/AuthProvider";
import { SaveIcon } from "../Icons";

interface EditableNicknameProps extends InputHTMLAttributes<HTMLInputElement> {}

interface IForm {
  name: string;
}

export const EditableNickname = ({ ...props }: EditableNicknameProps) => {
  const {
    user: { name },
    updateUser,
  } = useAuth();
  const [isEdit, setIsEdit] = useState(false);

  const { register, handleSubmit, setValue } = useForm<IForm>({
    defaultValues: { name },
  });

  const submit = (data: IForm) => {
    updateUser({ name: data.name || name });
  };

  const handleError = () => {
    setValue("name", name);
  };

  const changeEditState = () => {
    setIsEdit(!isEdit);
  };

  useEffect(() => {
    setValue("name", name);
  }, [name]);

  return (
    name && (
      <Styled.Form onSubmit={handleSubmit(submit, handleError)}>
        <Styled.EditableNickname
          disabled={!isEdit}
          {...props}
          {...register("name", { required: true })}
        />
        <IconButton
          onClick={changeEditState}
          type="submit"
          icon={<SaveIcon state={isEdit} />}
        />
      </Styled.Form>
    )
  );
};
