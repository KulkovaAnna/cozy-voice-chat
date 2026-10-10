import { useMemo, useState } from "react";
import { toast } from "react-toastify";

import { Button } from "@cvc/components";
import {
  useSettingActions,
  useSetting,
  useUnsavedChangesGuard,
} from "@cvc/hooks";
import { useAuth } from "@cvc/providers";
import type { AvatarBorder, CardAppearance, CardBackground } from "@cvc/types";
import { deleteProfileFile, uploadProfileFile } from "@cvc/api";

import { AvatarBorderEditor } from "../AvatarBorderEditor";
import { BackgroundPicker } from "../BackgroundPicker";
import { CardPreview } from "../CardPreview";
import { TextEditor, type CardTextSettings } from "../TextEditor";
import * as Styles from "./CardCustomization.styles";

export function CardCustomization() {
  const { user, updateUser } = useAuth();
  const profile = useSetting((state) => state.profile);
  const { setProfile } = useSettingActions();

  const [draft, setDraft] = useState<CardAppearance>(profile.cardAppearance);
  const [syncedFrom, setSyncedFrom] = useState(profile.cardAppearance);

  if (profile.cardAppearance !== syncedFrom) {
    setSyncedFrom(profile.cardAppearance);
    setDraft(profile.cardAppearance);
  }

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(profile.cardAppearance),
    [draft, profile.cardAppearance],
  );

  const setBackground = (background: CardBackground) => {
    setDraft((prev) => ({ ...prev, background }));
  };

  const setAvatarBorder = (avatarBorder: AvatarBorder) => {
    setDraft((prev) => ({ ...prev, avatarBorder }));
  };

  const setTextSettings = (settings: CardTextSettings) => {
    setDraft((prev) => ({ ...prev, ...settings }));
  };

  const save = () => {
    const usedImages = new Set(
      [draft.background.image].filter((image): image is string => !!image),
    );
    [profile.cardAppearance.background.image]
      .filter((image): image is string => !!image && !usedImages.has(image))
      .forEach(deleteProfileFile);

    setProfile({ cardAppearance: draft });
    updateUser({ cardAppearance: draft });
    toast("Внешний вид карточки сохранён", { type: "success" });
  };

  useUnsavedChangesGuard(isDirty, save, "Карточка пользователя");

  const changeAvatar = async (file: File) => {
    try {
      const url = await uploadProfileFile(file);
      // Старый аватар больше не нужен — удаляем с сервера
      deleteProfileFile(profile.avatar);
      setProfile({ avatar: url });
    } catch {
      toast("Не удалось загрузить аватар", { type: "error" });
    }
  };

  return (
    <Styles.Container>
      <CardPreview
        name={user.name}
        avatar={profile.avatar}
        appearance={draft}
        onAvatarChange={changeAvatar}
      />

      <Styles.Controls>
        <Styles.ControlsColumn>
          <BackgroundPicker
            label="Фон карточки в лобби"
            value={draft.background}
            onChange={setBackground}
          />

          <TextEditor
            value={{ textColor: draft.textColor, textShadow: draft.textShadow }}
            onChange={setTextSettings}
          />
        </Styles.ControlsColumn>
        <Styles.ControlsColumn>
          <AvatarBorderEditor
            value={draft.avatarBorder}
            onChange={setAvatarBorder}
          />
        </Styles.ControlsColumn>
      </Styles.Controls>

      <Styles.SaveRow>
        <Button type="button" onClick={save} disabled={!isDirty}>
          Сохранить
        </Button>
      </Styles.SaveRow>
    </Styles.Container>
  );
}
