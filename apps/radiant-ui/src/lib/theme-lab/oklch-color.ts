const LINEAR_CHANNELS = 3;

function srgbToLinear(channel: number): number {
	return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(channel: number): number {
	const clamped = Math.min(1, Math.max(0, channel));
	return clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055;
}

export type Oklch = { lightness: number; chroma: number; hue: number };

/** Parses `#rgb` or `#rrggbb` into 0-1 sRGB channels, or `undefined` for anything else. */
function parseHex(hex: string): [number, number, number] | undefined {
	const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
	if (!match) return undefined;
	const digits = match[1].length === 3 ? [...match[1]].map((digit) => digit + digit).join('') : match[1];
	return [0, 2, 4].map((start) => Number.parseInt(digits.slice(start, start + 2), 16) / 255) as [
		number,
		number,
		number,
	];
}

/** Converts a hex color to OKLCH (Bjorn Ottosson's matrices), or `undefined` when it is not a hex color. */
export function hexToOklch(hex: string): Oklch | undefined {
	const rgb = parseHex(hex);
	if (!rgb) return undefined;
	const [r, g, b] = rgb.map(srgbToLinear) as [number, number, number];
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
	const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const bAxis = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	const hue = (Math.atan2(bAxis, a) * 180) / Math.PI;
	return { lightness, chroma: Math.hypot(a, bAxis), hue: hue < 0 ? hue + 360 : hue };
}

/**
 * Converts OKLCH to a hex color, clipping channels that fall outside sRGB. The result is for showing a swatch, not for
 * round-tripping a color that the display cannot reproduce.
 */
export function oklchToHex({ lightness, chroma, hue }: Oklch): string {
	const radians = (hue * Math.PI) / 180;
	const a = chroma * Math.cos(radians);
	const b = chroma * Math.sin(radians);
	const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
	const linear = [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	];
	return `#${linear
		.slice(0, LINEAR_CHANNELS)
		.map((channel) =>
			Math.round(linearToSrgb(channel) * 255)
				.toString(16)
				.padStart(2, '0'),
		)
		.join('')}`;
}

/** Below this chroma a color is grey and its hue is meaningless. */
export const MIN_HUE_CHROMA = 0.02;

/** The OKLCH hue of a hex color in whole degrees, or `undefined` for invalid input and greys. */
export function hexToHue(hex: string): number | undefined {
	const color = hexToOklch(hex);
	if (!color || color.chroma < MIN_HUE_CHROMA) return undefined;
	return Math.round(color.hue) % 360;
}
