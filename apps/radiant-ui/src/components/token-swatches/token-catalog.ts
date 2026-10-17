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
			{ token: '--focus-ring', onToken: '--on-focus-ring' },
			{ token: '--link' },
			{ token: '--overlay' },
			{ token: '--neutral' },
			{ token: '--rui-primary' },
			{ token: '--rui-secondary' },
			{ token: '--rui-neutral' },
			{ token: '--background-code', onToken: '--on-background-code' },
		],
	},
];

export const grayScaleTokens: readonly string[] = STEPS_50_950.map((step) => `--gray-${step}`);

export const absoluteColorTokens: readonly string[] = ['--color-black', '--color-white'];

export const palettePacks: readonly PalettePack[] = [
	{
		id: 'cloudflare',
		label: 'Cloudflare',
		packFile: '@ecopages/radiant-themes/cloudflare',
		scales: [
			{
				name: 'Cloudflare colors',
				tokens: [
					'--color-cloudflare-canvas',
					'--color-cloudflare-elevated',
					'--color-cloudflare-recessed',
					'--color-cloudflare-base',
					'--color-cloudflare-tint',
					'--color-cloudflare-border',
					'--color-cloudflare-fg',
					'--color-cloudflare-muted-fg',
					'--color-cloudflare-blue',
					'--color-cloudflare-amber',
					'--color-cloudflare-green',
					'--color-cloudflare-red',
					'--color-cloudflare-purple',
				],
			},
		],
	},
	{
		id: 'rui-default',
		label: 'Radiant Default',
		packFile: '@ecopages/radiant-ui/tokens/colors/rui-default',
		scales: [
			colorScale('rui-default', STEPS_50_975),
			colorScale('carbon-blue', STEPS_50_975),
			colorScale('carbon-violet', STEPS_50_975),
			colorScale('carbon-red', STEPS_50_975),
			colorScale('carbon-green', STEPS_50_975),
			colorScale('carbon-amber', STEPS_50_975),
		],
	},
	{
		id: 'material',
		label: 'Material Design',
		packFile: '@ecopages/radiant-themes/material',
		scales: [
			{
				name: 'Material Design role seeds',
				tokens: ['--material-primary', '--material-secondary', '--material-tertiary', '--material-error'],
			},
			{
				name: 'Material Design surfaces',
				tokens: [
					'--material-canvas',
					'--material-surface',
					'--material-surface-container',
					'--material-outline',
					'--material-text',
				],
			},
		],
	},
	{
		id: 'github',
		label: 'GitHub',
		packFile: '@ecopages/radiant-themes/github',
		scales: [
			{
				name: 'GitHub colors',
				tokens: [
					'--color-github-white',
					'--color-github-canvas',
					'--color-github-subtle',
					'--color-github-muted',
					'--color-github-border',
					'--color-github-fg',
					'--color-github-muted-fg',
					'--color-github-blue',
					'--color-github-blue-light',
					'--color-github-green',
					'--color-github-red',
					'--color-github-orange',
					'--color-github-purple',
				],
			},
		],
	},
	{
		id: 'vscode',
		label: 'VS Code',
		packFile: '@ecopages/radiant-themes/vscode',
		scales: [
			{
				name: 'VS Code colors',
				tokens: [
					'--color-vscode-canvas',
					'--color-vscode-subtle',
					'--color-vscode-muted',
					'--color-vscode-border',
					'--color-vscode-fg',
					'--color-vscode-muted-fg',
					'--color-vscode-blue',
					'--color-vscode-blue-light',
					'--color-vscode-green',
					'--color-vscode-red',
					'--color-vscode-orange',
					'--color-vscode-purple',
				],
			},
		],
	},
	{
		id: 'vercel',
		label: 'Vercel',
		packFile: '@ecopages/radiant-themes/vercel',
		scales: [
			colorScale('vercel-gray', STEPS_50_950),
			{
				name: 'Vercel colors',
				tokens: [
					'--color-vercel-blue',
					'--color-vercel-blue-light',
					'--color-vercel-red',
					'--color-vercel-amber',
					'--color-vercel-green',
					'--color-vercel-teal',
					'--color-vercel-purple',
					'--color-vercel-pink',
				],
			},
		],
	},
	{
		id: 'high-contrast',
		label: 'High Contrast',
		packFile: '@ecopages/radiant-themes/high-contrast',
		scales: [
			{
				name: 'High Contrast colors',
				tokens: [
					'--contrast-canvas',
					'--contrast-surface',
					'--contrast-container',
					'--contrast-text',
					'--contrast-primary',
					'--contrast-secondary',
					'--contrast-error',
					'--contrast-success',
					'--contrast-warning',
					'--contrast-focus',
				],
			},
		],
	},
	{
		id: 'windows95',
		label: 'Windows 95',
		packFile: '@ecopages/radiant-themes/windows95',
		scales: [
			{
				name: 'Windows 95 colors',
				tokens: [
					'--windows95-canvas',
					'--windows95-face',
					'--windows95-light',
					'--windows95-highlight',
					'--windows95-shadow',
					'--windows95-dark',
					'--windows95-text',
					'--windows95-blue',
					'--windows95-blue-light',
					'--windows95-green',
					'--windows95-red',
					'--windows95-amber',
				],
			},
		],
	},
	{
		id: 'macos-classic',
		label: 'Mac OS Classic',
		packFile: '@ecopages/radiant-themes/macos-classic',
		scales: [
			{
				name: 'Mac OS Classic colors',
				tokens: [
					'--macos-classic-canvas',
					'--macos-classic-surface',
					'--macos-classic-container',
					'--macos-classic-light',
					'--macos-classic-shadow',
					'--macos-classic-dark',
					'--macos-classic-text',
					'--macos-classic-muted',
					'--macos-classic-blue',
					'--macos-classic-blue-light',
					'--macos-classic-green',
					'--macos-classic-red',
					'--macos-classic-amber',
				],
			},
		],
	},
	{
		id: 'macos',
		label: 'macOS',
		packFile: '@ecopages/radiant-themes/macos',
		scales: [
			{
				name: 'macOS colors',
				tokens: [
					'--macos-canvas',
					'--macos-surface',
					'--macos-subtle',
					'--macos-border',
					'--macos-text',
					'--macos-muted',
					'--macos-blue',
					'--macos-blue-light',
					'--macos-green',
					'--macos-red',
					'--macos-amber',
					'--macos-purple',
				],
			},
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
