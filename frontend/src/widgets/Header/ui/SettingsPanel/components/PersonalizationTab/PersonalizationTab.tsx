import { Avatar } from "@cvc/components";
import { AvatarChanger, EditableNickname } from "@cvc/features";
import { useAuth } from "@cvc/providers";
import { useTheme } from "@emotion/react";
import { Delimiter } from "../../SettingsPanel.styled";
import * as Styled from "./PersonalizationTab.styles";

export const PersonalizationTab = () => {
  const { user, updateUser } = useAuth();
  const theme = useTheme();

  const deleteAvatar = () => {
    updateUser({ avatar: undefined });
  };

  return (
    <>
      <Styled.AvatarRow>
        <Styled.Row>
          <Styled.AvatarPreview>
            <Avatar src={user.avatar} size={80} />
          </Styled.AvatarPreview>
          <Styled.Block>
            <h4>Аватар профиля</h4>
            <Styled.SubText>PNG, JPG, GIF</Styled.SubText>
          </Styled.Block>
        </Styled.Row>
        <Styled.Row>
          <AvatarChanger />
          <Styled.DeleteButton
            onClick={deleteAvatar}
            variant={theme.colors.status.error}
          >
            Удалить
          </Styled.DeleteButton>
        </Styled.Row>
      </Styled.AvatarRow>
      <Delimiter />
      <Styled.Row>
        <Styled.Block>
          <h4>Имя</h4>
          <EditableNickname />
        </Styled.Block>
      </Styled.Row>
    </>
  );
};
