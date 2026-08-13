/** Docs catalog of public token names. Values come from live CSS variables, not this file. */

export type ColorSwatch = {
	token: string;
	onToken?: string;
};

export type ColorFamily = {
	id: string;
	label: string;
	description: string;
	swatches: readonly ColorSwatch[];
};

export type PaletteScale = {
	name: string;
	tokens: readonly string[];
};

export type PalettePack = {
	id: string;
	label: string;
	packFile: string;
	scales: readonly PaletteScale[];
};

export type NamedToken = {
	token: string;
	label?: string;
};

const STEPS_50_950 = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const STEPS_50_975 = [...STEPS_50_950, 975] as const;

function colorScale(prefix: string, steps: readonly number[]): PaletteScale {
	return {
		name: prefix,
		tokens: steps.map((step) => `--color-${prefix}-${step}`),
	};
}

export function tokenStepLabel(token: string): string {
	const step = token.match(/-(\d+|full|none|xs|sm|md|lg|xl|2xl|3xl|black|white)$/)?.[1];
	return step ?? token.replace(/^--(?:color-)?/, '');
}

function rolePair(role: string): ColorSwatch[] {
	return [
		{ token: `--${role}`, onToken: `--on-${role}` },
		{ token: `--${role}-container`, onToken: `--on-${role}-container` },
		{ token: `--${role}-light` },
		{ token: `--${role}-dark` },
	];
}

export const semanticColorFamilies: readonly ColorFamily[] = [
	{
		id: 'brand',
		label: 'Brand',
		description: 'Primary, secondary, and tertiary families. Components consume these roles, not palette steps.',
		swatches: [
			...rolePair('primary'),
			...rolePair('secondary'),
			{ token: '--tertiary', onToken: '--on-tertiary' },
			{ token: '--tertiary-container', onToken: '--on-tertiary-container' },
		],
	},
	{
		id: 'status',
		label: 'Status',
		description: 'Notification and validation families. destructive aliases error.',
		swatches: [...rolePair('error'), ...rolePair('success'), ...rolePair('info'), ...rolePair('warning')],
	},
	{
		id: 'surfaces',
		label: 'Surfaces',
		description: 'Page and container backgrounds with matching on-colours.',
		swatches: [
			{ token: '--background', onToken: '--on-background' },
			{ token: '--surface', onToken: '--on-surface' },
			{ token: '--surface-container-lowest', onToken: '--on-surface-container-lowest' },
			{ token: '--surface-container-low', onToken: '--on-surface-container-low' },
			{ token: '--surface-container', onToken: '--on-surface-container' },
			{ token: '--surface-container-high', onToken: '--on-surface-container-high' },
			{ token: '--surface-container-highest', onToken: '--on-surface-container-highest' },
		],
	},
	{
		id: 'supporting',
		label: 'Supporting',
		description: 'Chrome, focus, links, overlays, and code surfaces.',
		swatches: [
			{ token: '--border' },
			{ token: '--focus-ring' },
			{ token: '--link' },
			{ token: '--overlay' },
			{ token: '--neutral' },
			{ token: '--background-code', onToken: '--on-background-code' },
		],
	},
];

export const grayScaleTokens: readonly string[] = STEPS_50_950.map((step) => `--gray-${step}`);

export const absoluteColorTokens: readonly string[] = ['--color-black', '--color-white'];

export const palettePacks: readonly PalettePack[] = [
	{
		id: 'glacier',
		label: 'Glacier',
		packFile: '@ecopages/radiant-ui/tokens/colors/glacier',
		scales: [
			colorScale('night-sky', STEPS_50_975),
			colorScale('scarlet', STEPS_50_975),
			colorScale('glacier-white', STEPS_50_975),
			colorScale('laser-lemon', STEPS_50_975),
			colorScale('navy-blue', STEPS_50_975),
		],
	},
	{
		id: 'aurora',
		label: 'Aurora',
		packFile: '@ecopages/radiant-ui/tokens/colors/aurora',
		scales: [
			colorScale('havelock-blue', STEPS_50_975),
			colorScale('hit-pink', STEPS_50_975),
			colorScale('fruit-salad', STEPS_50_975),
			colorScale('pale-sky', STEPS_50_975),
			colorScale('cardinal', STEPS_50_975),
		],
	},
	{
		id: 'basalt',
		label: 'Basalt',
		packFile: '@ecopages/radiant-ui/tokens/colors/basalt',
		scales: [
			colorScale('basalt', STEPS_50_975),
			colorScale('carbon-blue', STEPS_50_975),
			colorScale('carbon-teal', STEPS_50_975),
			colorScale('carbon-red', STEPS_50_975),
		],
	},
];

export const spacingScaleTokens: readonly string[] = [
	'--space-1',
	'--space-2',
	'--space-3',
	'--space-4',
	'--space-5',
	'--space-6',
	'--space-8',
	'--space-10',
	'--space-12',
	'--space-16',
];

export const spacingRoleTokens: readonly NamedToken[] = [
	{ token: '--space-control-x', label: 'Control inline padding' },
	{ token: '--space-control-y', label: 'Control block padding' },
	{ token: '--space-inline', label: 'Horizontal gaps' },
	{ token: '--space-stack', label: 'Vertical rhythm' },
	{ token: '--space-inset', label: 'Container inset' },
];

export const radiusScaleTokens: readonly string[] = [
	'--border-radius-none',
	'--border-radius-xs',
	'--border-radius-sm',
	'--border-radius-md',
	'--border-radius-lg',
	'--border-radius-xl',
	'--border-radius-2xl',
	'--border-radius-3xl',
	'--border-radius-full',
];

export const radiusRoleTokens: readonly NamedToken[] = [
	{ token: '--radius-control', label: 'Buttons, inputs, and other controls' },
	{ token: '--radius-container', label: 'Cards, panels, and surfaces' },
	{ token: '--radius-pill', label: 'Chips and fully rounded controls' },
];

export const elevationTokens: readonly NamedToken[] = [
	{ token: '--shadow-control', label: 'Resting controls' },
	{ token: '--shadow-overlay', label: 'Popovers, menus, and dropdowns' },
	{ token: '--shadow-modal', label: 'Dialogs and modal layers' },
];

export const typographySizeTokens: readonly string[] = [
	'--text-xs',
	'--text-sm',
	'--text-body',
	'--text-label',
	'--text-control',
	'--text-lg',
	'--text-xl',
	'--text-2xl',
	'--text-3xl',
	'--text-4xl',
];
