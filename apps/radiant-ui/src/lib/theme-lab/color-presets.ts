/** Primary hues (OKLCH degrees) offered as starting points in the theme lab. */
export const themeLabColorPresets = [
	{ name: 'Blue', hue: 255 },
	{ name: 'Indigo', hue: 275 },
	{ name: 'Violet', hue: 305 },
	{ name: 'Magenta', hue: 335 },
	{ name: 'Rose', hue: 5 },
	{ name: 'Red', hue: 25 },
	{ name: 'Orange', hue: 55 },
	{ name: 'Amber', hue: 80 },
	{ name: 'Lime', hue: 125 },
	{ name: 'Green', hue: 150 },
	{ name: 'Teal', hue: 185 },
	{ name: 'Cyan', hue: 220 },
] as const;

/** Scale steps shown in the palette preview. */
export const themeLabScaleSteps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/** CSS custom property prefix of each derived scale in Radiant Default. */
export const themeLabScales = [
	{ label: 'Primary', prefix: '--color-carbon-blue' },
	{ label: 'Secondary', prefix: '--color-carbon-violet' },
	{ label: 'Neutral', prefix: '--color-rui-default' },
] as const;
