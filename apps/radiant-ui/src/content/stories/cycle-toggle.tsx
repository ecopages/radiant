import type { RuiButtonSize, RuiButtonVariant } from '@ecopages/radiant-ui/button';
import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

const THEME_DEFAULT_VALUE = 'system';

export type CycleToggleArgs = {
	value: string;
	variant: RuiButtonVariant;
	size: RuiButtonSize;
	disabled: boolean;
	label: string;
};

function resolveThemeValue(value: string | undefined): string {
	return value || THEME_DEFAULT_VALUE;
}

function buildCycleToggleExampleCode(args: CycleToggleArgs): string {
	const value = resolveThemeValue(args.value);

	const item = (id: string, label: string) =>
		`  <RuiCycleToggleItem id="${id}"${value === id ? ' selected' : ''}>${label}</RuiCycleToggleItem>`;

	return [
		"import { RuiCycleToggle, RuiCycleToggleItem } from '@ecopages/radiant-ui/cycle-toggle';",
		'',
		`<RuiCycleToggle value="${value}" label="${args.label}" variant="${args.variant}" size="${args.size}"${args.disabled ? ' disabled' : ''}>`,
		item('system', 'System'),
		item('light', 'Light'),
		item('dark', 'Dark'),
		'</RuiCycleToggle>',
	].join('\n');
}

function buildSortOrderExampleCode(args: CycleToggleArgs): string {
	return buildExampleCode('RuiCycleToggle', 'cycle-toggle', { ...args, value: args.value || 'newest' });
}

export const meta = {
	component: 'cycle-toggle',
	exportName: 'RuiCycleToggle',
	args: {
		value: THEME_DEFAULT_VALUE,
		variant: 'ghost',
		size: 'sm',
		disabled: false,
		label: 'Theme',
	},
	argTypes: {
		value: {
			control: { type: 'select' },
			options: ['system', 'light', 'dark'] as const,
		},
		variant: {
			control: { type: 'select' },
			options: ['filled', 'outline', 'destructive', 'ghost'] as const satisfies readonly RuiButtonVariant[],
		},
		size: {
			control: { type: 'select' },
			options: ['sm', 'md', 'lg'] as const satisfies readonly RuiButtonSize[],
		},
		disabled: { control: { type: 'boolean' } },
		label: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildCycleToggleExampleCode(args),
	render: (args) =>
		renderPlaygroundPreview('cycle-toggle-theme', {
			...args,
			value: resolveThemeValue(args.value),
		}),
} satisfies DocsMeta<CycleToggleArgs>;

type Story = DocsStory<CycleToggleArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'cycle-toggle/default' } } });

export const SortOrder: Story = docsStory(meta, {
	args: {
		value: 'newest',
		variant: 'outline',
		size: 'md',
		label: 'Sort order',
	},
	exampleCode: (args) => buildSortOrderExampleCode(args),
	render: (args) => renderPlaygroundPreview('cycle-toggle-sort-order', args),
	parameters: { docs: { id: 'cycle-toggle/sort-order' } },
});
