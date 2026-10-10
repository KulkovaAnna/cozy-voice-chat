import type {
  AvatarBorderData,
  BackgroundType,
  BorderStyle,
  CardAppearanceData,
  CardBackgroundData,
} from '../types';

const BORDER_STYLES: BorderStyle[] = [
  'none',
  'solid',
  'dashed',
  'dotted',
  'double',
];

const BACKGROUND_TYPES: BackgroundType[] = ['none', 'color', 'image'];

const DEFAULT_BORDER: AvatarBorderData = {
  style: 'none',
  color: '#ffffff',
  width: 2,
};

const DEFAULT_BACKGROUND: CardBackgroundData = {
  type: 'none',
  color: null,
  image: null,
  imageOpacity: 1,
};

/** Максимальная длина URL/строки цвета в настройках карточки */
const MAX_URL_LENGTH = 2048;

/** Максимальная длина строки цвета текста */
const MAX_TEXT_COLOR_LENGTH = 64;

function normalizeImageOpacity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_BACKGROUND.imageOpacity;
  }

  return Math.min(1, Math.max(0, value));
}

function normalizeBackground(raw: unknown): CardBackgroundData {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_BACKGROUND };
  }

  const bg = raw as Partial<CardBackgroundData>;
  const type = BACKGROUND_TYPES.includes(bg.type as BackgroundType)
    ? (bg.type as BackgroundType)
    : DEFAULT_BACKGROUND.type;

  return {
    type,
    color:
      typeof bg.color === 'string' && bg.color.length <= MAX_URL_LENGTH
        ? bg.color
        : null,
    image:
      typeof bg.image === 'string' && bg.image.length <= MAX_URL_LENGTH
        ? bg.image
        : null,
    imageOpacity: normalizeImageOpacity(bg.imageOpacity),
  };
}

function normalizeBorder(raw: unknown): AvatarBorderData {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_BORDER };
  }

  const border = raw as Partial<AvatarBorderData>;

  return {
    style: BORDER_STYLES.includes(border.style as BorderStyle)
      ? (border.style as BorderStyle)
      : DEFAULT_BORDER.style,
    color:
      typeof border.color === 'string' && border.color.length <= 64
        ? border.color
        : DEFAULT_BORDER.color,
    width:
      typeof border.width === 'number' &&
      Number.isFinite(border.width) &&
      border.width >= 0 &&
      border.width <= 20
        ? Math.round(border.width)
        : DEFAULT_BORDER.width,
  };
}

export function normalizeCardAppearance(
  raw: unknown,
): CardAppearanceData | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const appearance = raw as Partial<CardAppearanceData>;

  return {
    background: normalizeBackground(appearance.background),
    avatarBorder: normalizeBorder(appearance.avatarBorder),
    textColor:
      typeof appearance.textColor === 'string' &&
      appearance.textColor.length <= MAX_TEXT_COLOR_LENGTH
        ? appearance.textColor
        : null,
    textShadow:
      typeof appearance.textShadow === 'boolean'
        ? appearance.textShadow
        : false,
  };
}

export default class PersonalInfo {
  public name: string;
  public avatar: string | null;
  public cardAppearance: CardAppearanceData | null;

  constructor(
    name?: string | null,
    avatar?: string | null,
    cardAppearance?: CardAppearanceData | null,
  ) {
    this.name = name || `Аноним_${Date.now()}`;
    this.avatar = avatar || null;
    this.cardAppearance = normalizeCardAppearance(cardAppearance);
  }
}
