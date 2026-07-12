export const THEME_CONFIG = {
	light: { label: 'Light', icon: 'sun' },
	dark: { label: 'Dark', icon: 'moon' },
} as const;

export type ThemeKey = keyof typeof THEME_CONFIG;

export type ConfigValue = {
	label: string;
};
