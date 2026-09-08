import {
  useEffect,
  useRef,
  useState,
  type ChangeEventHandler,
  type FormEventHandler,
  type KeyboardEventHandler,
} from "react";
import { IconButton } from "../../components/IconButton";
import { AttachmentIcon, LoadingIcon, SendIcon } from "../../components/Icons";
import { Message } from "../../components/Message";
import { SidePanel } from "../../components/SidePanel";
import { useAuth } from "../../providers/AuthProvider";
import { useTextChat } from "../../providers/TextChatProvider";
import * as Styles from "./TextChat.styles";
import { FileInfo } from "../../components/FileInfo";

export function TextChat() {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    textChatIsOpen,
    hasNewMessages,
    messages,
    switchTextChatIsOpen,
    sendTextMessage,
    sendFile,
  } = useTextChat();

  const me = useAuth();
  const msgRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const attachmentRef = useRef<HTMLInputElement>(null);

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

  const submit = async () => {
    if (file) {
      setLoading(true);
      await sendFile(file).finally(() => setLoading(false));
      setFile(null);
    }
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

  const handleFileSelect: ChangeEventHandler<HTMLInputElement> = (e) => {
    setFile(e.target.files?.[0] || null);
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
        <div>
          {!!file && <FileInfo file={file} />}
          <Styles.FormPanel onSubmit={handleSubmit}>
            <Styles.AttachmentWrapper>
              <label htmlFor="file">
                <AttachmentIcon />
              </label>
              <input
                onChange={handleFileSelect}
                ref={attachmentRef}
                name="file"
                type="file"
                id="file"
                multiple={false}
              />
            </Styles.AttachmentWrapper>

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
              disabled={(!text && !file) || loading}
              icon={
                loading ? (
                  <LoadingIcon styles={{ width: 40, height: 40 }} />
                ) : (
                  <SendIcon />
                )
              }
              variant="secondary"
              onMouseDown={(e) => e.preventDefault()}
            />
          </Styles.FormPanel>
        </div>
      </Styles.Container>
      <audio src="/audio/sms.mp3" ref={audioRef} onEnded={resetAudio} />
    </SidePanel>
  );
}
