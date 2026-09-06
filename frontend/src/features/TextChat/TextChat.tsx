import {
  useEffect,
  useRef,
  useState,
  type ChangeEventHandler,
  type FormEventHandler,
  type KeyboardEventHandler,
} from "react";
import { IconButton } from "../../components/IconButton";
import { SendIcon } from "../../components/Icons";
import { Message } from "../../components/Message";
import { SidePanel } from "../../components/SidePanel";
import { useAuth } from "../../providers/AuthProvider";
import { useTextChat } from "../../providers/TextChatProvider";
import * as Styles from "./TextChat.styles";

export function TextChat() {
  const [text, setText] = useState("");

  const {
    textChatIsOpen,
    hasNewMessages,
    messages,
    switchTextChatIsOpen,
    sendTextMessage,
  } = useTextChat();

  const me = useAuth();
  const msgRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleInputChange: ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  > = (e) => {
    setText(e.target.value);
  };

  const handleInputResize = () => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "auto";
    inputRef.current.style.height =
      Math.max(45, inputRef.current.scrollHeight) + "px";
  };

  const submit = () => {
    if (text) {
      sendTextMessage(text);
      setText("");
      requestAnimationFrame(handleInputResize);
    }
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    submit();
  };

  const handleEnter: KeyboardEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  > = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const resetAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  useEffect(() => {
    if (msgRef.current) {
      msgRef.current.scrollTo({
        top: msgRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  useEffect(() => {
    if (hasNewMessages && audioRef.current) {
      audioRef.current.play();
    }
  }, [hasNewMessages, messages]);

  return (
    <SidePanel isOpen={textChatIsOpen} onClose={switchTextChatIsOpen}>
      <Styles.Container>
        <Styles.MessagesContainer ref={msgRef}>
          {messages.map((msg) => {
            const position = msg.senderId === me.user.id ? "right" : "left";
            return (
              <Styles.MessageWrapper key={msg.id} $anglePosition={position}>
                <Message message={msg} anglePosition={position} />
              </Styles.MessageWrapper>
            );
          })}
        </Styles.MessagesContainer>
        <Styles.FormPanel onSubmit={handleSubmit}>
          <Styles.InputWrapper>
            <Styles.StyledInput
              name="message"
              placeholder="Введите сообщение..."
              onChange={handleInputChange}
              onInput={handleInputResize}
              value={text}
              isTextarea
              autoComplete="off"
              onKeyDown={handleEnter}
              ref={inputRef}
            />
          </Styles.InputWrapper>

          <IconButton
            disabled={!text}
            icon={<SendIcon />}
            variant="secondary"
            onMouseDown={(e) => e.preventDefault()}
          />
        </Styles.FormPanel>
      </Styles.Container>
      <audio src="/audio/sms.mp3" ref={audioRef} onEnded={resetAudio} />
    </SidePanel>
  );
}
