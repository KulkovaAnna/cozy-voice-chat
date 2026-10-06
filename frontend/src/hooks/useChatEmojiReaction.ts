import { useEffect, useRef, useState } from "react";

import type { TextMessage } from "@cvc/types";
import { extractSingleEmoji } from "@cvc/utils";

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
 */
export function useChatEmojiReaction(messages: TextMessage[]) {
  const [reaction, setReaction] = useState<EmojiReaction | null>(null);

  const processedCount = useRef(0);
  const nonce = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Сообщения очистились (завершение звонка) — просто синхронизируем счётчик.
    if (messages.length < processedCount.current) {
      processedCount.current = messages.length;
      return;
    }

    if (messages.length === processedCount.current) return;

    let emoji: string | null = null;
    let senderId = "";

    for (let i = processedCount.current; i < messages.length; i += 1) {
      const single = extractSingleEmoji(messages[i].message);
      if (single) {
        emoji = single;
        senderId = messages[i].senderId;
      }
    }
    processedCount.current = messages.length;

    if (!emoji) return;

    nonce.current += 1;
    setReaction({ senderId, emoji, nonce: nonce.current });

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setReaction(null), REACTION_LIFETIME_MS);
  }, [messages]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return reaction;
}
