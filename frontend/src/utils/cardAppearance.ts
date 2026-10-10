import type { CSSProperties } from "react";
import type { CSSObject } from "@emotion/react";

import type { CardAppearance, CardBackground } from "../types";

/** CSS-переменная с url фоновой картинки карточки */
const CARD_IMAGE_VAR = "--cvc-card-image";
/** CSS-переменная с прозрачностью фоновой картинки карточки */
const CARD_IMAGE_OPACITY_VAR = "--cvc-card-image-opacity";

/**
 * Слой фоновой картинки карточки.
 *
 * Картинка рисуется псевдоэлементом ::before, а не фоном самого элемента, —
 * только так можно задать прозрачность картинки, не затрагивая содержимое
 * карточки. Параметры слой берёт из CSS-переменных, которые проставляются
 * инлайн-стилями из {@link backgroundToCss}.
 *
 * `isolation: isolate` обязателен: он создаёт контекст наложения, внутри
 * которого слой с `z-index: -1` рисуется поверх фона карточки, но под её
 * содержимым.
 */
export const cardImageLayerStyles = {
  position: "relative",
  isolation: "isolate",
  "&::before": {
    content: '""',
    position: "absolute",
    inset: 0,
    zIndex: -1,
    borderRadius: "inherit",
    pointerEvents: "none",
    backgroundImage: `var(${CARD_IMAGE_VAR}, none)`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    opacity: `var(${CARD_IMAGE_OPACITY_VAR}, 1)`,
  },
} satisfies CSSObject;

/** Экранирует url для CSS-функции url(...). */
function toCssUrl(image: string): string {
  return `url("${image.replace(/["'\\s]/g, encodeURIComponent)}")`;
}

/** Прозрачность картинки фона в допустимом диапазоне 0..1. */
function resolveImageOpacity(background: CardBackground): number {
  const opacity = background.imageOpacity;
  if (typeof opacity !== "number" || !Number.isFinite(opacity)) return 1;
  return Math.min(1, Math.max(0, opacity));
}

/**
 * Преобразует фон карточки в CSS-свойства (или undefined, если фона нет).
 *
 * Цвет задаётся фоном самого элемента, картинка — только CSS-переменными
 * для слоя {@link cardImageLayerStyles}.
 */
export function backgroundToCss(
  background: CardBackground | null | undefined,
): CSSProperties | undefined {
  if (!background) return undefined;

  switch (background.type) {
    case "color":
      return background.color
        ? {
            backgroundImage: `linear-gradient(${background.color}, ${background.color})`,
          }
        : undefined;
    case "image":
      return background.image
        ? ({
            [CARD_IMAGE_VAR]: toCssUrl(background.image),
            [CARD_IMAGE_OPACITY_VAR]: String(resolveImageOpacity(background)),
          } as CSSProperties)
        : undefined;
    case "none":
    default:
      return undefined;
  }
}

/** Тень текста внутри карточки. */
const CARD_TEXT_SHADOW = "0 1px 3px rgba(0, 0, 0, 0.85)";

/**
 * Преобразует настройки текста карточки в инлайн-стили (или undefined,
 * если текст не переопределён).
 *
 * Применяются точечно — только к тексту внутри карточки, чтобы не красить
 * служебные элементы интерфейса.
 */
export function cardTextToCss(
  appearance: CardAppearance | null | undefined,
): CSSProperties | undefined {
  if (!appearance) return undefined;

  const css: Record<string, string> = {};

  if (appearance.textColor) css.color = appearance.textColor;
  if (appearance.textShadow) css.textShadow = CARD_TEXT_SHADOW;

  return Object.keys(css).length > 0 ? (css as CSSProperties) : undefined;
}
