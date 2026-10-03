import { useCallback, useEffect, useRef, useState } from "react";

import { usePageVisibility } from "./usePageVisibility";

// Минимальное описание Document Picture-in-Picture API.
// Типов в DOM-библиотеке TypeScript может не быть — используем своё.
type DocumentPictureInPictureLike = {
  requestWindow: (options?: {
    width?: number;
    height?: number;
    disallowReturnToOpener?: boolean;
  }) => Promise<Window>;
};

type UseDocumentPictureInPictureParams = {
  width?: number;
  height?: number;
};

function getDocumentPictureInPictureApi() {
  if (typeof window === "undefined") return null;
  const api = (
    window as unknown as {
      documentPictureInPicture?: DocumentPictureInPictureLike;
    }
  ).documentPictureInPicture;
  return api ?? null;
}

// Копирует все стилевые теги основного документа в окно PiP.
// Emotion инжектит правила в <head> основного документа, поэтому без
// копирования портал в окно PiP отрендерится без стилей.
function copyStyles(target: Document) {
  document.querySelectorAll("head style").forEach((style) => {
    target.head.appendChild(style.cloneNode(true));
  });
  document
    .querySelectorAll<HTMLLinkElement>('head link[rel="stylesheet"]')
    .forEach((link) => {
      const clone = link.cloneNode(true) as HTMLLinkElement;
      // В окне PiP относительные href не резолвятся — подставляем абсолютный URL.
      clone.href = link.href;
      target.head.appendChild(clone);
    });
}

/**
 * Хук управления окном Document Picture-in-Picture: открытие, закрытие,
 * копирование и дальнейшая синхронизация стилей основного документа.
 */
export function useDocumentPictureInPicture(
  props: UseDocumentPictureInPictureParams = {},
) {
  const width = props.width ?? 360;
  const height = props.height ?? 180;

  const api = getDocumentPictureInPictureApi();
  const isSupported = api !== null;

  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const isOpen = pipWindow !== null;

  const pipWindowRef = useRef<Window | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  // Окно открыто браузером без клика (mediaSession enterpictureinpicture).
  const autoOpenedRef = useRef(false);
  // Основное окно уже теряло фокус с момента автооткрытия.
  const wasUnfocusedRef = useRef(false);
  // Связка "стилевой тег основного документа -> его клон в окне PiP"
  const styleClonesRef = useRef(
    new WeakMap<HTMLStyleElement, HTMLStyleElement>(),
  );

  // Повторная синхронизация содержимого уже скопированного <style>:
  // в dev-режиме Emotion дописывает правила текстом в существующие теги.
  const syncStyleTag = useCallback((source: HTMLStyleElement) => {
    const pip = pipWindowRef.current;
    if (!pip) return;
    const clone = styleClonesRef.current.get(source);
    if (clone) {
      clone.textContent = source.textContent;
      return;
    }
    const newClone = source.cloneNode(true) as HTMLStyleElement;
    styleClonesRef.current.set(source, newClone);
    pip.document.head.appendChild(newClone);
  }, []);

  const handleMutation = useCallback(
    (mutations: MutationRecord[]) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLStyleElement) {
              syncStyleTag(node);
            } else if (
              node instanceof HTMLLinkElement &&
              node.rel === "stylesheet"
            ) {
              const pip = pipWindowRef.current;
              if (!pip) return;
              const clone = node.cloneNode(true) as HTMLLinkElement;
              clone.href = node.href;
              pip.document.head.appendChild(clone);
            }
          });
        }
        // Изменения текста внутри <style> — обновляем клон.
        const styleElement =
          mutation.target instanceof HTMLStyleElement
            ? mutation.target
            : mutation.target.parentElement instanceof HTMLStyleElement
              ? mutation.target.parentElement
              : null;
        if (styleElement && document.head.contains(styleElement)) {
          syncStyleTag(styleElement);
        }
      }
    },
    [syncStyleTag],
  );

  const handleClose = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    pipWindowRef.current = null;
    autoOpenedRef.current = false;
    wasUnfocusedRef.current = false;
    setPipWindow(null);
  }, []);

  const open = useCallback(async () => {
    if (!api || pipWindowRef.current) return;
    try {
      const win = await api.requestWindow({
        width,
        height,
        disallowReturnToOpener: true,
      });

      pipWindowRef.current = win;
      win.document.body.style.margin = "0";
      win.addEventListener("pagehide", handleClose);

      // Сначала наблюдаем, затем копируем — так не будет гонок между
      // запросом существующих тегов и установкой наблюдателя.
      const observer = new MutationObserver(handleMutation);
      observer.observe(document.head, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      observerRef.current = observer;

      copyStyles(win.document);
      setPipWindow(win);
    } catch {
      // Браузер может отказать: нет user activation или лимит окон.
      pipWindowRef.current = null;
      autoOpenedRef.current = false;
      setPipWindow(null);
    }
  }, [api, width, height, handleClose, handleMutation]);

  // Открытие без пользовательского жеста: вызывается из mediaSession-хэндлера
  // "enterpictureinpicture", который браузер запускает при потере фокуса табом.
  const openAuto = useCallback(() => {
    autoOpenedRef.current = true;
    void open();
  }, [open]);

  const close = useCallback(() => {
    pipWindowRef.current?.close();
  }, []);

  const isTabVisible = usePageVisibility();

  // Окно, открытое браузером без клика, должно закрываться, когда
  // пользователь возвращается на таб со звонком.
  useEffect(() => {
    if (!isOpen || !autoOpenedRef.current) return;

    // На момент автооткрытия фокус уже потерян — фиксируем это, чтобы
    // не закрыть окно немедленно.
    if (!document.hasFocus() || document.hidden) {
      wasUnfocusedRef.current = true;
    }

    const handleBlur = () => {
      wasUnfocusedRef.current = true;
    };

    const handleFocus = () => {
      if (wasUnfocusedRef.current) close();
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isOpen, close]);

  // Возврат табa в видимое состояние тоже закрывает авто-окно.
  useEffect(() => {
    if (!isOpen || !autoOpenedRef.current) return;
    if (!isTabVisible) {
      wasUnfocusedRef.current = true;
      return;
    }
    if (wasUnfocusedRef.current) close();
  }, [isOpen, isTabVisible, close]);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

  return {
    isSupported,
    isOpen,
    pipWindow,
    open,
    openAuto,
    close,
  };
}
