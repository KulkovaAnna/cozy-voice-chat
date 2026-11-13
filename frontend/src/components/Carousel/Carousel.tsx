import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { wrapIndex } from "@cvc/utils";

import { CloseIcon, SkipNextIcon, SkipPrevIcon } from "../Icons";
import * as Styles from "./Carousel.styles";

export type CarouselItem = {
  id: string;
  src: string;
  alt?: string;
};

export type CarouselProps = {
  items: CarouselItem[];
  /** Кадр, который открывается первым */
  initialIndex?: number;
  onClose: VoidFunction;
};

/**
 * Полноэкранная галерея картинок с круговой навигацией.
 *
 * Рендерится порталом в `document.body`: панель чата сдвигается через
 * `transform`, а такой предок превращает `position: fixed` во внутреннюю
 * систему координат и обрезает оверлей.
 */
export function Carousel(props: CarouselProps) {
  const { items, initialIndex, onClose } = props;
  const total = items.length;
  const [index, setIndex] = useState(() => wrapIndex(initialIndex ?? 0, total));
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const go = useCallback(
    (step: number) => {
      setIndex((prev) => wrapIndex(prev + step, total));
    },
    [total],
  );

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeButtonRef.current?.focus({ preventScroll: true });

    // После закрытия возвращаем фокус туда, откуда открыли галерею
    return () => {
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, []);

  // Пока галерея открыта, страница под ней не должна прокручиваться
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (total < 2) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [go, onClose, total]);

  if (total === 0) return null;

  const current = items[index];

  return createPortal(
    <Styles.Overlay
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр изображений"
      onClick={onClose}
    >
      <Styles.Stage onClick={(event) => event.stopPropagation()}>
        <Styles.Image
          src={current.src}
          alt={current.alt ?? "Изображение"}
          draggable={false}
          decoding="async"
        />
        {total > 1 && (
          <>
            <Styles.NavButton
              type="button"
              $side="left"
              aria-label="Предыдущее изображение"
              onClick={() => go(-1)}
            >
              <SkipPrevIcon />
            </Styles.NavButton>
            <Styles.NavButton
              type="button"
              $side="right"
              aria-label="Следующее изображение"
              onClick={() => go(1)}
            >
              <SkipNextIcon />
            </Styles.NavButton>
            <Styles.Counter>
              {index + 1} / {total}
            </Styles.Counter>
          </>
        )}
      </Styles.Stage>
      <Styles.CloseButton
        type="button"
        ref={closeButtonRef}
        aria-label="Закрыть просмотр"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        <CloseIcon />
      </Styles.CloseButton>
    </Styles.Overlay>,
    document.body,
  );
}
