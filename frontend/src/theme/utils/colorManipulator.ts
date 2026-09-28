export type ColorType = "rgb" | "rgba" | "hsl" | "hsla" | "color";

export interface Color {
  type: string;
  values: number[];
  colorSpace?: string;
}

/**
 * Returns a number whose value is limited to the given range.
 * @param value The value to be clamped
 * @param min The lower boundary of the output range
 * @param max The upper boundary of the output range
 * @returns A number in the range [min, max]
 */
function clamp(value: number, min = 0, max = 1): number {
  if (value < min || value > max) {
    console.error(
      `The value provided ${value} is out of range [${min}, ${max}].`,
    );
  }

  return Math.min(Math.max(min, value), max);
}

/**
 * Converts a color from CSS hex format to CSS rgb format.
 * @param color - Hex color, i.e. #nnn or #nnnnnn
 * @returns A CSS rgb color string
 */
export function hexToRgb(color: string): string {
  color = color.slice(1);

  const re = new RegExp(`.{1,${color.length >= 6 ? 2 : 1}}`, "g");
  let colors = Array.from(color.match(re) || []);

  if (colors && colors[0].length === 1) {
    colors = colors.map((n) => n + n);
  }

  return colors
    ? `rgb${colors.length === 4 ? "a" : ""}(${colors
        .map((n, index) => {
          return index < 3
            ? parseInt(n, 16)
            : Math.round((parseInt(n, 16) / 255) * 1000) / 1000;
        })
        .join(", ")})`
    : "";
}

function intToHex(int: number): string {
  const hex = int.toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
}

/**
 * Returns an object with the type and values of a color.
 *
 * Note: Does not support rgb % values.
 * @param color - CSS color, i.e. one of: #nnn, #nnnnnn, rgb(), rgba(), hsl(), hsla(), color()
 * @returns A color object: {type: string, values: number[]}
 */
export function decomposeColor(color: Color | string): Color {
  // Idempotent: уже разложенный цвет возвращается как есть
  if (typeof color !== "string") {
    return color;
  }

  if (color.charAt(0) === "#") {
    return decomposeColor(hexToRgb(color));
  }

  const marker = color.indexOf("(");
  const type = color.substring(0, marker);
  const channels = color.substring(marker + 1, color.length - 1);

  let parts: string[];
  let colorSpace: string | undefined;

  if (type === "color") {
    parts = channels.split(" ");
    colorSpace = parts.shift();
    if (parts.length === 4 && parts[3].charAt(0) === "/") {
      parts[3] = parts[3].slice(1);
    }
  } else {
    parts = channels.split(",");
  }

  const values = parts.map((value) => parseFloat(value));

  return { type, values, colorSpace };
}

/**
 * Returns a channel created from the input color.
 *
 * @param color - CSS color, i.e. one of: #nnn, #nnnnnn, rgb(), rgba(), hsl(), hsla(), color()
 * @returns The channel for the color, that can be used in rgba or hsla colors
 */
export const colorChannel = (color: Color | string): string => {
  const decomposedColor = decomposeColor(color);
  return decomposedColor.values
    .slice(0, 3)
    .map((val, idx) =>
      decomposedColor.type.indexOf("hsl") !== -1 && idx !== 0 ? `${val}%` : val,
    )
    .join(" ");
};

/**
 * Converts a color object with type and values to a string.
 * @param color - Decomposed color
 * @returns A CSS color string
 */
export function recomposeColor(color: Color): string {
  const { type, colorSpace } = color;
  // Значения могут становиться строками ("50%", "/0.5") на этапе сборки строки
  let values: Array<number | string> = color.values;

  if (type.indexOf("rgb") !== -1) {
    // Only convert the first 3 values to int (i.e. not alpha)
    values = values.map((n, i) => (i < 3 ? parseInt(String(n), 10) : n));
  } else if (type.indexOf("hsl") !== -1) {
    values[1] = `${values[1]}%`;
    values[2] = `${values[2]}%`;
  }

  const channels =
    type.indexOf("color") !== -1
      ? `${colorSpace} ${values.join(" ")}`
      : values.join(", ");

  return `${type}(${channels})`;
}

/**
 * Converts a color from CSS rgb format to CSS hex format.
 * @param color - RGB color, i.e. rgb(n, n, n)
 * @returns A CSS rgb color string, i.e. #nnnnnn
 */
export function rgbToHex(color: string): string {
  // Idempotent
  if (color.indexOf("#") === 0) {
    return color;
  }

  const { values } = decomposeColor(color);
  return `#${values.map((n, i) => intToHex(i === 3 ? Math.round(255 * n) : n)).join("")}`;
}

/**
 * Converts a color from hsl format to rgb format.
 * @param color - HSL color values
 * @returns rgb color values
 */
export function hslToRgb(color: Color | string): string {
  const decomposedColor = decomposeColor(color);
  const { values } = decomposedColor;
  const h = values[0];
  const s = values[1] / 100;
  const l = values[2] / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number, k = (n + h / 30) % 12) =>
    l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);

  let type = "rgb";
  const rgb = [
    Math.round(f(0) * 255),
    Math.round(f(8) * 255),
    Math.round(f(4) * 255),
  ];

  if (decomposedColor.type === "hsla") {
    type += "a";
    rgb.push(values[3]);
  }

  return recomposeColor({ type, values: rgb });
}

/**
 * The relative brightness of any point in a color space,
 * normalized to 0 for darkest black and 1 for lightest white.
 *
 * Formula: https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-tests
 * @param color - CSS color, i.e. one of: #nnn, #nnnnnn, rgb(), rgba(), hsl(), hsla(), color()
 * @returns The relative brightness of the color in the range 0 - 1
 */
export function getLuminance(color: Color | string): number {
  const decomposedColor = decomposeColor(color);

  let rgb =
    decomposedColor.type === "hsl"
      ? decomposeColor(hslToRgb(decomposedColor)).values
      : decomposedColor.values;
  rgb = rgb.map((val) => {
    if (decomposedColor.type !== "color") {
      val /= 255; // normalized
    }
    return val <= 0.03928 ? val / 12.92 : ((val + 0.055) / 1.055) ** 2.4;
  });

  // Truncate at 3 digits
  return Number(
    (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]).toFixed(3),
  );
}

/**
 * Calculates the contrast ratio between two colors.
 *
 * Formula: https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-tests
 * @param foreground - CSS color, i.e. one of: #nnn, #nnnnnn, rgb(), rgba(), hsl(), hsla()
 * @param background - CSS color, i.e. one of: #nnn, #nnnnnn, rgb(), rgba(), hsl(), hsla()
 * @returns A contrast ratio value in the range 0 - 21.
 */
export function getContrastRatio(
  foreground: Color | string,
  background: Color | string,
): number {
  const lumA = getLuminance(foreground);
  const lumB = getLuminance(background);
  return (Math.max(lumA, lumB) + 0.05) / (Math.min(lumA, lumB) + 0.05);
}

/**
 * Sets the absolute transparency of a color.
 * Any existing alpha values are overwritten.
 * @param color - CSS color, i.e. one of: #nnn, #nnnnnn, rgb(), rgba(), hsl(), hsla(), color()
 * @param value - value to set the alpha channel to in the range 0 - 1
 * @returns A CSS color string. Hex input values are returned as rgb
 */
export function alpha(color: Color | string, value: number): string {
  const decomposedColor = decomposeColor(color);
  const alphaValue = clamp(value);

  if (decomposedColor.type === "rgb" || decomposedColor.type === "hsl") {
    decomposedColor.type += "a";
  }
  if (decomposedColor.type === "color") {
    // В нотации color() альфа пишется как "/0.5", поэтому это строка
    (decomposedColor.values as Array<number | string>)[3] = `/${alphaValue}`;
  } else {
    decomposedColor.values[3] = alphaValue;
  }

  return recomposeColor(decomposedColor);
}

/**
 * Darkens a color.
 * @param color - CSS color, i.e. one of: #nnn, #nnnnnn, rgb(), rgba(), hsl(), hsla(), color()
 * @param coefficient - multiplier in the range 0 - 1
 * @returns A CSS color string. Hex input values are returned as rgb
 */
export function darken(color: Color | string, coefficient: number): string {
  const decomposedColor = decomposeColor(color);
  const value = clamp(coefficient);

  if (decomposedColor.type.indexOf("hsl") !== -1) {
    decomposedColor.values[2] *= 1 - value;
  } else if (
    decomposedColor.type.indexOf("rgb") !== -1 ||
    decomposedColor.type.indexOf("color") !== -1
  ) {
    for (let i = 0; i < 3; i += 1) {
      decomposedColor.values[i] *= 1 - value;
    }
  }
  return recomposeColor(decomposedColor);
}

/**
 * Lightens a color.
 * @param color - CSS color, i.e. one of: #nnn, #nnnnnn, rgb(), rgba(), hsl(), hsla(), color()
 * @param coefficient - multiplier in the range 0 - 1
 * @returns A CSS color string. Hex input values are returned as rgb
 */
export function lighten(color: Color | string, coefficient: number): string {
  const decomposedColor = decomposeColor(color);
  const value = clamp(coefficient);

  if (decomposedColor.type.indexOf("hsl") !== -1) {
    decomposedColor.values[2] += (100 - decomposedColor.values[2]) * value;
  } else if (decomposedColor.type.indexOf("rgb") !== -1) {
    for (let i = 0; i < 3; i += 1) {
      decomposedColor.values[i] += (255 - decomposedColor.values[i]) * value;
    }
  } else if (decomposedColor.type.indexOf("color") !== -1) {
    for (let i = 0; i < 3; i += 1) {
      decomposedColor.values[i] += (1 - decomposedColor.values[i]) * value;
    }
  }

  return recomposeColor(decomposedColor);
}

/**
 * Darken or lighten a color, depending on its luminance.
 * Light colors are darkened, dark colors are lightened.
 * @param color - CSS color, i.e. one of: #nnn, #nnnnnn, rgb(), rgba(), hsl(), hsla(), color()
 * @param coefficient - multiplier in the range 0 - 1
 * @returns A CSS color string. Hex input values are returned as rgb
 */
export function emphasize(color: Color | string, coefficient = 0.15): string {
  return getLuminance(color) > 0.5
    ? darken(color, coefficient)
    : lighten(color, coefficient);
}
