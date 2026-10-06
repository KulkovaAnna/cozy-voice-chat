import Picker, { Theme } from "emoji-picker-react";
import { useTheme } from "@emotion/react";
import { EmojiIcon, IconButton } from "@cvc/components";
import { useClickOutside } from "@cvc/hooks";
import * as Styles from "./EmojiPicker.styles";

const EMOJI_PICKER_ID = "emoji-picker";

export type EmojiPickerProps = {
  onSelect: (emoji: string) => void;
};

export function EmojiPicker(props: EmojiPickerProps) {
  const { name } = useTheme() as { name: string };
  const { visible, openMenu, closeMenu } = useClickOutside(EMOJI_PICKER_ID);

  const handleSelect = (data: { emoji: string }) => {
    props.onSelect(data.emoji);
    closeMenu();
  };

  return (
    <Styles.Wrapper id={EMOJI_PICKER_ID}>
      {visible && (
        <Styles.Popover>
          <Picker
            onEmojiClick={handleSelect}
            theme={name === "dark" ? Theme.DARK : Theme.LIGHT}
            previewConfig={{ showPreview: false }}
          />
        </Styles.Popover>
      )}
      <IconButton
        type="button"
        icon={<EmojiIcon />}
        variant="secondary"
        onClick={visible ? closeMenu : openMenu}
        onMouseDown={(e) => e.preventDefault()}
      />
    </Styles.Wrapper>
  );
}
