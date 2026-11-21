import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEventHandler,
  type DragEventHandler,
  type KeyboardEventHandler,
  type SubmitEventHandler,
} from "react";
import { toast } from "react-toastify";

import {
  AttachmentIcon,
  CloseIcon,
  IconButton,
  LoadingIcon,
  Message,
  SendIcon,
  SidePanel,
} from "@cvc/components";
import { CommandSuggest, EmojiPicker, MusicPlayer } from "@cvc/features";
import { useAuth, useChatNetwork, useTextChat } from "@cvc/providers";
import {
  appendAttachments,
  extractClipboardFiles,
  extractDroppedFiles,
  isFileDrag,
  MAX_ATTACHMENT_FILES,
  namePastedFile,
} from "@cvc/utils";

import * as Styles from "./TextChat.styles";

/** Страховка на случай, если статус «done» не дошёл (yt-dlp ждёт 60 с) */
const COMMAND_TIMEOUT_MS = 90_000;

export function TextChat() {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [commandTimedOut, setCommandTimedOut] = useState(false);

  const {
    textChatIsOpen,
    hasNewMessages,
    messages,
    switchTextChatIsOpen,
    sendTextMessage,
    uploadAttachments,
  } = useTextChat();

  const { commandStatus } = useChatNetwork();

  const me = useAuth();
  const msgRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const dragDepthRef = useRef(0);
  const [isDragActive, setIsDragActive] = useState(false);

  const attachFiles = useCallback(
    (incoming: File[]) => {
      if (incoming.length === 0) return;

      const { files: next, rejected } = appendAttachments(files, incoming);
      setFiles(next);

      if (rejected > 0) {
        toast(`Можно прикрепить не больше ${MAX_ATTACHMENT_FILES} файлов`, {
          type: "info",
        });
      }

      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [files],
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  // Счётчик глубины: dragleave срабатывает и на дочерних элементах,
  // поэтому подсветку снимаем только когда курсор покинул всю панель
  const handleDragEnter: DragEventHandler<HTMLDivElement> = (e) => {
    if (!textChatIsOpen || !isFileDrag(e.dataTransfer)) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragOver: DragEventHandler<HTMLDivElement> = (e) => {
    if (!textChatIsOpen || !isFileDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave: DragEventHandler<HTMLDivElement> = (e) => {
    if (!isFileDrag(e.dataTransfer)) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragActive(false);
  };

  const handleDrop: DragEventHandler<HTMLDivElement> = (e) => {
    if (!isFileDrag(e.dataTransfer)) return;

    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDragActive(false);

    if (!textChatIsOpen) return;

    const dropped = extractDroppedFiles(e.dataTransfer);

    if (dropped.length === 0) {
      toast("Папки пока не поддерживаются", { type: "info" });
      return;
    }

    attachFiles(dropped);
  };

  // Подсветку сбрасываем при закрытии чата, чтобы она не «залипла»
  useEffect(() => {
    if (textChatIsOpen) return;
    dragDepthRef.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDragActive(false);
  }, [textChatIsOpen]);

  // Вставка файла или скриншота из буфера обмена — только при открытом чате.
  // Поля ввода вне панели (например, в настройках) не перехватываем.
  useEffect(() => {
    if (!textChatIsOpen) return;

    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target !== inputRef.current &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA")
      ) {
        return;
      }

      const pasted = extractClipboardFiles(event.clipboardData);
      if (pasted.length === 0) return;

      event.preventDefault();
      attachFiles(pasted.map((file) => namePastedFile(file)));
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [attachFiles, textChatIsOpen]);

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
    if ((!text && files.length === 0) || loading) return;

    let attachmentIds: string[] = [];

    if (files.length > 0) {
      setLoading(true);
      const uploaded = await uploadAttachments(files).finally(() =>
        setLoading(false),
      );
      // При ошибке вложения остаются, чтобы можно было повторить отправку
      if (!uploaded) return;
      attachmentIds = uploaded.map((attachment) => attachment.id);
      setFiles([]);
    }

    if (text || attachmentIds.length > 0) {
      sendTextMessage(text, attachmentIds);
      setText("");
      requestAnimationFrame(handleInputResize);
    }
  };

  // Страховочный таймаут: если статус «done» не дошёл, индикатор погаснет сам
  useEffect(() => {
    if (!commandStatus) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCommandTimedOut(false);
      return;
    }
    const timer = setTimeout(
      () => setCommandTimedOut(true),
      COMMAND_TIMEOUT_MS,
    );
    return () => clearTimeout(timer);
  }, [commandStatus]);

  const isCommandRunning = !!commandStatus && !commandTimedOut;

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
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
    const selected = Array.from(e.target.files ?? []);
    // Сбрасываем значение, иначе те же файлы нельзя выбрать повторно
    e.target.value = "";
    attachFiles(selected);
  };

  // Вставляет выбранную эмодзи в позицию курсора (или в конец, если курсора нет).
  const handleEmojiSelect = (emoji: string) => {
    const input = inputRef.current;
    if (!input) {
      setText((prev) => prev + emoji);
      return;
    }

    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? text.length;
    const caret = start + emoji.length;

    setText(text.slice(0, start) + emoji + text.slice(end));

    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(caret, caret);
      handleInputResize();
    });
  };

  // Вставляет выбранную команду, заменяя уже набранный слэш-префикс
  const handleCommandSelect = (command: string) => {
    const input = inputRef.current;
    const caretPos = input?.selectionStart ?? text.length;
    const selEnd = input?.selectionEnd ?? text.length;

    // Ищем начало слэш-префикса перед курсором, чтобы заменить его целиком
    const before = text.slice(0, caretPos);
    const slashPos = before.lastIndexOf("/");
    const hasSlash =
      slashPos !== -1 &&
      (slashPos === 0 || /\s/.test(before[slashPos - 1] ?? ""));
    const start = hasSlash ? slashPos : caretPos;

    const insert = "/" + command;
    setText(text.slice(0, start) + insert + text.slice(selEnd));

    const caret = start + insert.length;
    requestAnimationFrame(() => {
      if (!input) return;
      input.focus();
      input.setSelectionRange(caret, caret);
      handleInputResize();
    });
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
    <SidePanel
      isOpen={textChatIsOpen}
      onClose={switchTextChatIsOpen}
      zIndex={9}
    >
      <Styles.Container
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragActive && (
          <Styles.DropOverlay>
            <AttachmentIcon />
            <Styles.DropOverlayText>
              Перетащите файлы сюда, чтобы прикрепить их к сообщению
            </Styles.DropOverlayText>
          </Styles.DropOverlay>
        )}
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
          {files.length > 0 && (
            <Styles.AttachmentList>
              {files.map((file, index) => (
                <Styles.AttachmentRow
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                >
                  <Styles.StyledFileInfo file={file} />
                  <Styles.RemoveAttachmentButton
                    type="button"
                    title="Убрать файл"
                    aria-label={`Убрать файл ${file.name}`}
                    onClick={() => removeFile(index)}
                  >
                    <CloseIcon />
                  </Styles.RemoveAttachmentButton>
                </Styles.AttachmentRow>
              ))}
            </Styles.AttachmentList>
          )}
          <MusicPlayer />
          <Styles.FormPanel onSubmit={handleSubmit}>
            <Styles.AttachmentWrapper>
              <label htmlFor="file">
                <AttachmentIcon />
              </label>
              <input
                onChange={handleFileSelect}
                name="files"
                type="file"
                id="file"
                multiple
              />
            </Styles.AttachmentWrapper>

            <EmojiPicker onSelect={handleEmojiSelect} />

            {files.length === 0 && (
              <CommandSuggest text={text} onSelect={handleCommandSelect} />
            )}

            <Styles.InputWrapper>
              {isCommandRunning && (
                <Styles.CommandStatusLine>
                  <LoadingIcon styles={{ width: 12, height: 12 }} />
                  {commandStatus?.text}
                </Styles.CommandStatusLine>
              )}
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
              disabled={(!text && files.length === 0) || loading}
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
