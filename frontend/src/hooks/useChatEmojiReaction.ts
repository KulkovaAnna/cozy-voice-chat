import { useEffect, useRef, useState } from "react";

import type { TextMessage } from "@cvc/types";
import { findLastSingleEmoji } from "@cvc/utils";

export type EmojiReaction = {
  /** ID отправителя сообщения-эмодзи */
  senderId: string;
  emoji: string;
  /** Порядковый номер реакции: меняет key у overlay и перезапускает анимацию */
  nonce: number;
};

const REACTION_LIFETIME_MS = 3000;

/**
 * Отслеживает новые текстовые сообщения и возвращает реакцию для последнего
 * сообщения, состоящего ровно из одной эмодзи. Реакция автоматически сбрасывается
 * через REACTION_LIFETIME_MS секунд.
 *
 * `messagesEpoch` увеличивается, когда список сообщений подменяется целиком:
 * загрузка истории комнаты или очистка после звонка. Такие сообщения не новые,
 * поэтому история не должна проигрывать эмодзи у тех, кто только подключился.
 */
export function useChatEmojiReaction(
  messages: TextMessage[],
  messagesEpoch = 0,
) {
  const [reaction, setReaction] = useState<EmojiReaction | null>(null);

  const processedCount = useRef(messages.length);
  const processedEpoch = useRef(messagesEpoch);
  const nonce = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Список заменили целиком (история комнаты или очистка) — синхронизируем
    // счётчик без показа реакции: это не новые сообщения.
    if (processedEpoch.current !== messagesEpoch) {
      processedEpoch.current = messagesEpoch;
      processedCount.current = messages.length;
      if (timer.current) clearTimeout(timer.current);
      setReaction(null);
      return;
    }

    // Сообщения очистились (завершение звонка) — просто синхронизируем счётчик.
    if (messages.length < processedCount.current) {
      processedCount.current = messages.length;
      return;
    }

    if (messages.length === processedCount.current) return;

    const single = findLastSingleEmoji(messages, processedCount.current);
    processedCount.current = messages.length;

    if (!single) return;

    nonce.current += 1;
    setReaction({
      senderId: single.senderId,
      emoji: single.emoji,
      nonce: nonce.current,
    });

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setReaction(null), REACTION_LIFETIME_MS);
  }, [messages, messagesEpoch]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return reaction;
}
