export type DocsDefaultThemeTuning = {
	primaryHue: number;
	secondaryOffset: number;
	neutralHue: number;
	density: number;
	radiusScale: number;
	borderAlpha: number;
};

type DocsDefaultThemeTuningKey = keyof DocsDefaultThemeTuning;

type DocsDefaultThemeTuningSetting = {
	label: string;
	min: number;
	max: number;
	step: number;
	unit: string;
	defaultValue: number;
	cssVariable: string;
	cssValueTemplate: string;
};

const DOCS_DEFAULT_TUNING_VALUE = '{{value}}';

export const DOCS_DEFAULT_TUNING_SCHEMA: Record<DocsDefaultThemeTuningKey, DocsDefaultThemeTuningSetting> = {
	primaryHue: {
		label: 'Primary hue',
		min: 0,
		max: 360,
		step: 1,
		unit: '°',
		defaultValue: 264,
		cssVariable: '--rui-primary',
		cssValueTemplate: 'oklch(52% 0.19 {{value}})',
	},
	secondaryOffset: {
		label: 'Secondary offset',
		min: -180,
		max: 180,
		step: 1,
		unit: '°',
		defaultValue: 40,
		cssVariable: '--rui-secondary',
		cssValueTemplate: 'oklch(from var(--rui-primary) 63.5% 0.095 calc(h + {{value}}))',
	},
	neutralHue: {
		label: 'Neutral hue',
		min: 0,
		max: 360,
		step: 1,
		unit: '°',
		defaultValue: 265,
		cssVariable: '--rui-neutral',
		cssValueTemplate: 'oklch(62% 0.014 {{value}})',
	},
	density: {
		label: 'Density',
		min: 0.85,
		max: 1.15,
		step: 0.01,
		unit: '×',
		defaultValue: 1,
		cssVariable: '--rui-density',
		cssValueTemplate: '{{value}}',
	},
	radiusScale: {
		label: 'Corner radius',
		min: 0.75,
		max: 1.25,
		step: 0.01,
		unit: '×',
		defaultValue: 1,
		cssVariable: '--rui-radius-scale',
		cssValueTemplate: '{{value}}',
	},
	borderAlpha: {
		label: 'Border opacity',
		min: 8,
		max: 100,
		step: 1,
		unit: '%',
		defaultValue: 20,
		cssVariable: '--rui-border-alpha',
		cssValueTemplate: '{{value}}%',
	},
};

export const DOCS_DEFAULT_THEME_TUNING: DocsDefaultThemeTuning = {
	primaryHue: DOCS_DEFAULT_TUNING_SCHEMA.primaryHue.defaultValue,
	secondaryOffset: DOCS_DEFAULT_TUNING_SCHEMA.secondaryOffset.defaultValue,
	neutralHue: DOCS_DEFAULT_TUNING_SCHEMA.neutralHue.defaultValue,
	density: DOCS_DEFAULT_TUNING_SCHEMA.density.defaultValue,
	radiusScale: DOCS_DEFAULT_TUNING_SCHEMA.radiusScale.defaultValue,
	borderAlpha: DOCS_DEFAULT_TUNING_SCHEMA.borderAlpha.defaultValue,
};

export function parseDocsDefaultThemeTuning(value: unknown): DocsDefaultThemeTuning {
	let parsed = value;
	if (typeof value === 'string') {
		try {
			parsed = JSON.parse(value) as unknown;
		} catch {
			return DOCS_DEFAULT_THEME_TUNING;
		}
	}
	if (parsed == null || typeof parsed !== 'object') return DOCS_DEFAULT_THEME_TUNING;
	const record = parsed as Record<string, unknown>;
	const valueFor = (key: keyof DocsDefaultThemeTuning): number => {
		const { min, max } = DOCS_DEFAULT_TUNING_SCHEMA[key];
		const raw = Number(record[key]);
		const fallback = DOCS_DEFAULT_THEME_TUNING[key];
		return Number.isFinite(raw) ? Math.min(max, Math.max(min, raw)) : fallback;
	};
	return {
		primaryHue: valueFor('primaryHue'),
		secondaryOffset: valueFor('secondaryOffset'),
		neutralHue: valueFor('neutralHue'),
		density: valueFor('density'),
		radiusScale: valueFor('radiusScale'),
		borderAlpha: valueFor('borderAlpha'),
	};
}

export function applyDefaultThemeTuning(root: HTMLElement, tuning: DocsDefaultThemeTuning): void {
	for (const key of Object.keys(DOCS_DEFAULT_TUNING_SCHEMA) as DocsDefaultThemeTuningKey[]) {
		const { cssVariable, cssValueTemplate } = DOCS_DEFAULT_TUNING_SCHEMA[key];
		root.style.setProperty(cssVariable, cssValueTemplate.replace(DOCS_DEFAULT_TUNING_VALUE, String(tuning[key])));
	}
}

export function clearDefaultThemeTuning(root: HTMLElement): void {
	for (const key of Object.keys(DOCS_DEFAULT_TUNING_SCHEMA) as DocsDefaultThemeTuningKey[]) {
		root.style.removeProperty(DOCS_DEFAULT_TUNING_SCHEMA[key].cssVariable);
	}
}

export function createDocsDefaultThemeTuningCss(tuning: DocsDefaultThemeTuning): string {
	const declarations = (Object.keys(DOCS_DEFAULT_TUNING_SCHEMA) as DocsDefaultThemeTuningKey[])
		.map((key) => {
			const { cssVariable, cssValueTemplate } = DOCS_DEFAULT_TUNING_SCHEMA[key];
			const value = cssValueTemplate.replace(DOCS_DEFAULT_TUNING_VALUE, String(tuning[key]));
			return `\t${cssVariable}: ${value};`;
		})
		.join('\n');
	return `:root {\n${declarations}\n}`;
}
