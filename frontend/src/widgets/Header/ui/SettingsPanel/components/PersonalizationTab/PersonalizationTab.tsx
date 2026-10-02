import { Avatar, Delimiter } from "@cvc/components";
import { AvatarChanger, EditableNickname } from "@cvc/features";
import { useAuth } from "@cvc/providers";
import { useTheme } from "@emotion/react";
import * as Styles from "./PersonalizationTab.styles";
import { Section } from "../Section";

export const PersonalizationTab = () => {
  const { user, updateUser } = useAuth();
  const theme = useTheme();

  const deleteAvatar = () => {
    updateUser({ avatar: undefined });
  };

  return (
    <>
      <Section title="Аватар">
        <Styles.AvatarRow>
          <Styles.Row>
            <Styles.AvatarPreview>
              <Avatar src={user.avatar} size={80} />
            </Styles.AvatarPreview>
            <Styles.Block>
              <h4>Аватар профиля</h4>
              <Styles.SubText>PNG, JPG, GIF</Styles.SubText>
            </Styles.Block>
          </Styles.Row>
          <Styles.Row>
            <AvatarChanger />
            <Styles.DeleteButton
              onClick={deleteAvatar}
              variant={theme.colors.status.error}
            >
              Удалить
            </Styles.DeleteButton>
          </Styles.Row>
        </Styles.AvatarRow>
      </Section>

      <Delimiter />

      <Section title="Имя">
        <EditableNickname />
      </Section>
    </>
  );
};
