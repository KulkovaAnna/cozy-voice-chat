import React from "react";

function cleanUrl(url: string): { cleaned: string; trailing: string } {
  // Знаки, которые могут идти после ссылки и не являются её частью
  const trailingPunctuation = /[.,;:!?)]+$/;
  const match = url.match(trailingPunctuation);

  if (match) {
    return {
      cleaned: url.slice(0, -match[0].length),
      trailing: match[0],
    };
  }

  return { cleaned: url, trailing: "" };
}

export function formatTextWithLinks(text: string): React.ReactNode[] {
  if (!text) return [text];

  const urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Сбросим индекс, чтобы начать поиск с начала
  urlRegex.lastIndex = 0;

  while ((match = urlRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const matchIndex = match.index;

    // Добавляем текст перед ссылкой
    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex));
    }

    // Очищаем URL от знаков препинания в конце
    const { cleaned: url, trailing } = cleanUrl(fullMatch);

    // Определяем, нужно ли добавить протокол для www.
    let href = url;
    if (url.startsWith("www.")) {
      href = `https://${url}`;
    }

    // Проверяем, является ли это ссылкой (опционально)
    // Если хотите проверять только валидные URL, раскомментируйте:
    // if (isUrl(href)) {
    parts.push(
      <a key={matchIndex} href={href} target="_blank" rel="noopener noreferrer">
        {url}
      </a>,
    );
    // } else {
    //     parts.push(fullMatch);
    // }

    // Добавляем знаки препинания обратно
    if (trailing) {
      parts.push(trailing);
    }

    lastIndex = matchIndex + fullMatch.length;
  }

  // Добавляем оставшийся текст
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
