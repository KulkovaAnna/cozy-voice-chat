import { useEffect, useState, type InputHTMLAttributes } from "react";
import * as Styled from "./EditableNickname.styled";
import { IconButton } from "../IconButton";
import { useForm } from "react-hook-form";
import { useAuth } from "../../providers/AuthProvider";
import iconSave from "../../assets/save.svg";
import iconEdit from "../../assets/edit.svg";

interface EditableNicknameProps extends InputHTMLAttributes<HTMLInputElement> {}

interface IForm {
  name: string;
}

export const EditableNickname = ({ ...props }: EditableNicknameProps) => {
  const {
    user: { userName },
    updateUser,
  } = useAuth();
  const [isEdit, setIsEdit] = useState(false);

  const { register, handleSubmit, setValue } = useForm<IForm>({
    defaultValues: { name: userName },
  });

  const submit = (data: IForm) => {
    updateUser({ userName: data.name || userName });
  };

  const handleError = () => {
    setValue("name", userName);
  };

  const changeEditState = () => {
    setIsEdit(!isEdit);
  };

  useEffect(() => {
    setValue("name", userName);
  }, [userName]);

  return (
    userName && (
      <Styled.Form onSubmit={handleSubmit(submit, handleError)}>
        <Styled.EditableNickname
          disabled={!isEdit}
          {...props}
          {...register("name", { required: true })}
        />
        <IconButton
          onClick={changeEditState}
          type="submit"
          icon={isEdit ? iconSave : iconEdit}
        />
      </Styled.Form>
    )
  );
};
