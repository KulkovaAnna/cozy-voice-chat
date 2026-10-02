import { useEffect, useState, type InputHTMLAttributes } from "react";
import { useForm } from "react-hook-form";

import { EditIcon, IconButton, SaveIcon } from "@cvc/components";
import { useAuth } from "@cvc/providers";

import * as Styles from "./EditableNickname.styles";

type EditableNicknameProps = InputHTMLAttributes<
  HTMLInputElement | HTMLTextAreaElement
>;

interface IForm {
  name: string;
}

export const EditableNickname = ({ ...props }: EditableNicknameProps) => {
  const {
    user: { name },
    updateUser,
  } = useAuth();
  const [isEdit, setIsEdit] = useState(false);

  const { register, handleSubmit, setValue, setFocus } = useForm<IForm>({
    defaultValues: { name },
  });

  const submit = (data: IForm) => {
    updateUser({ name: data.name || name });
  };

  const handleError = () => {
    setValue("name", name);
  };

  const changeEditState = () => {
    if (!isEdit) {
      setFocus("name");
    }
    setIsEdit(!isEdit);
  };

  useEffect(() => {
    setValue("name", name);
  }, [name]);

  return (
    name && (
      <Styles.Form onSubmit={handleSubmit(submit, handleError)}>
        <Styles.EditableNickname
          disabled={!isEdit}
          {...props}
          {...register("name", { required: true })}
        />
        <IconButton
          onClick={changeEditState}
          type={isEdit ? "button" : "submit"}
          icon={isEdit ? <SaveIcon /> : <EditIcon />}
        />
      </Styles.Form>
    )
  );
};
