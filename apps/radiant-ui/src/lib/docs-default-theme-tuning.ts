export type DocsDefaultThemeTuning = {
	primaryHue: number;
	secondaryOffset: number;
	neutralHue: number;
	neutralTint: number;
	density: number;
	radiusScale: number;
	borderAlpha: number;
};

/** Dispatched on `document` with the new tuning as `detail` whenever the tuner changes a value. */
export const DOCS_TUNING_CHANGE_EVENT = 'radiant-ui-docs:tuning-change';

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
		defaultValue: 275,
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
		cssValueTemplate: 'oklch(62% calc(0.014 * var(--rui-neutral-tint, 1)) {{value}})',
	},
	neutralTint: {
		label: 'Neutral tint',
		min: 1,
		max: 4,
		step: 0.1,
		unit: '×',
		defaultValue: 1.3,
		cssVariable: '--rui-neutral-tint',
		cssValueTemplate: '{{value}}',
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
		min: 0,
		max: 4,
		step: 0.05,
		unit: '×',
		defaultValue: 0.45,
		cssVariable: '--rui-radius-scale',
		cssValueTemplate: '{{value}}',
	},
	borderAlpha: {
		label: 'Border opacity',
		min: 0,
		max: 100,
		step: 1,
		unit: '%',
		defaultValue: 11,
		cssVariable: '--rui-border-alpha',
		cssValueTemplate: '{{value}}%',
	},
};

export const DOCS_DEFAULT_THEME_TUNING: DocsDefaultThemeTuning = {
	primaryHue: DOCS_DEFAULT_TUNING_SCHEMA.primaryHue.defaultValue,
	secondaryOffset: DOCS_DEFAULT_TUNING_SCHEMA.secondaryOffset.defaultValue,
	neutralHue: DOCS_DEFAULT_TUNING_SCHEMA.neutralHue.defaultValue,
	neutralTint: DOCS_DEFAULT_TUNING_SCHEMA.neutralTint.defaultValue,
	density: DOCS_DEFAULT_TUNING_SCHEMA.density.defaultValue,
	radiusScale: DOCS_DEFAULT_TUNING_SCHEMA.radiusScale.defaultValue,
	borderAlpha: DOCS_DEFAULT_TUNING_SCHEMA.borderAlpha.defaultValue,
};

/**
 * Rounds to two decimals, the finest step any tuner control offers. Slider arithmetic, shared URLs and old storage can
 * all carry float noise such as 1.0000000000000002, which would otherwise end up in stored values and copied CSS.
 */
function roundTuningValue(value: number): number {
	return Math.round(value * 100) / 100;
}

/** Decimal places the slider step for `key` can express, which is how many digits the tuner shows for it. */
export function tuningValueDigits(key: keyof DocsDefaultThemeTuning): number {
	return DOCS_DEFAULT_TUNING_SCHEMA[key].step.toString().split('.')[1]?.length ?? 0;
}

/**
 * The text the tuner shows for a value: cut to the precision of its step, like the knob's readout. Stored values stay
 * as parsed; this only shapes what is displayed.
 */
export function formatTuningValue(key: keyof DocsDefaultThemeTuning, value: number): string {
	return `${value.toFixed(tuningValueDigits(key))}${DOCS_DEFAULT_TUNING_SCHEMA[key].unit}`;
}

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
		return Number.isFinite(raw) ? roundTuningValue(Math.min(max, Math.max(min, raw))) : fallback;
	};
	return {
		primaryHue: valueFor('primaryHue'),
		secondaryOffset: valueFor('secondaryOffset'),
		neutralHue: valueFor('neutralHue'),
		neutralTint: valueFor('neutralTint'),
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
