import { describe, expect, it } from "vitest";

import {
  extractSingleEmoji,
  findLastSingleEmoji,
  type EmojiSourceMessage,
} from "./emoji";

function msg(senderId: string, message: string): EmojiSourceMessage {
  return { senderId, message };
}

describe("extractSingleEmoji", () => {
  it("распознаёт одиночную эмодзи", () => {
    expect(extractSingleEmoji("😀")).toBe("😀");
    expect(extractSingleEmoji("  👍  ")).toBe("👍");
    expect(extractSingleEmoji("❤️")).toBe("❤️");
  });

  it("не считает эмодзи одиночной, если рядом есть текст или другие эмодзи", () => {
    expect(extractSingleEmoji("")).toBeNull();
    expect(extractSingleEmoji("   ")).toBeNull();
    expect(extractSingleEmoji("привет 😀")).toBeNull();
    expect(extractSingleEmoji("😀😀")).toBeNull();
    expect(extractSingleEmoji(":)")).toBeNull();
  });
});

describe("findLastSingleEmoji", () => {
  it("возвращает последнее сообщение-эмодзи из списка", () => {
    const messages = [
      msg("alice", "привет"),
      msg("alice", "😀"),
      msg("bob", "как дела?"),
      msg("bob", "🔥"),
    ];

    expect(findLastSingleEmoji(messages)).toEqual({
      emoji: "🔥",
      senderId: "bob",
    });
  });

  it("игнорирует историю до fromIndex — это не новые сообщения", () => {
    const messages = [
      msg("alice", "😀"),
      msg("alice", "текст"),
      msg("bob", "🔥"),
    ];

    expect(findLastSingleEmoji(messages, messages.length)).toBeNull();
    expect(findLastSingleEmoji(messages, 2)).toEqual({
      emoji: "🔥",
      senderId: "bob",
    });
  });

  it("возвращает null, если эмодзи-сообщений нет", () => {
    expect(findLastSingleEmoji([])).toBeNull();
    expect(findLastSingleEmoji([msg("alice", "привет")])).toBeNull();
  });
});
