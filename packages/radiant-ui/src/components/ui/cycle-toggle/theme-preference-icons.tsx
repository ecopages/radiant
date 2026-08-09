import type { JsxRenderable } from '@ecopages/jsx';

export type ThemePreference = 'system' | 'light' | 'dark';

const themeLabels: Record<ThemePreference, string> = {
	system: 'System',
	light: 'Light',
	dark: 'Dark',
};

const lucideIconProps = {
	xmlns: 'http://www.w3.org/2000/svg',
	width: 16,
	height: 16,
	viewBox: '0 0 24 24',
	fill: 'none',
	stroke: 'currentColor',
	'stroke-width': 2,
	'stroke-linecap': 'round',
	'stroke-linejoin': 'round',
	'aria-hidden': true,
} as const;

/** @remarks Paths copied from Lucide `monitor`, `sun`, and `moon` icons (ISC). */
const themeIcons: Record<ThemePreference, JsxRenderable> = {
	system: (
		<svg {...lucideIconProps}>
			<rect width="20" height="14" x="2" y="3" rx="2" />
			<line x1="8" x2="16" y1="21" y2="21" />
			<line x1="12" x2="12" y1="17" y2="21" />
		</svg>
	),
	light: (
		<svg {...lucideIconProps}>
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2v2" />
			<path d="M12 20v2" />
			<path d="m4.93 4.93 1.41 1.41" />
			<path d="m17.66 17.66 1.41 1.41" />
			<path d="M2 12h2" />
			<path d="M20 12h2" />
			<path d="m6.34 17.66-1.41 1.41" />
			<path d="m19.07 4.93-1.41 1.41" />
		</svg>
	),
	dark: (
		<svg {...lucideIconProps}>
			<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9" />
		</svg>
	),
};

export function ThemePreferenceIcon({ preference }: { preference: ThemePreference }): JsxRenderable {
	return themeIcons[preference];
}

export function ThemeItemLabel({ preference }: { preference: ThemePreference }): JsxRenderable {
	return themeLabels[preference];
}

export function ThemePreferenceItemContent({
	preference,
	showLabel = true,
}: {
	preference: ThemePreference;
	showLabel?: boolean;
}): JsxRenderable {
	return (
		<span class="inline-flex items-center gap-inline">
			<ThemePreferenceIcon preference={preference} />
			{showLabel ? (
				<ThemeItemLabel preference={preference} />
			) : (
				<span class="sr-only">{themeLabels[preference]}</span>
			)}
		</span>
	);
}
