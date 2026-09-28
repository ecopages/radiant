import type { RuiButtonSize, RuiButtonVariant } from '@ecopages/radiant-ui/button';
import { RuiCycleToggle, RuiCycleToggleItem } from '@ecopages/radiant-ui/cycle-toggle';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

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

export const meta = {
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
	render: (args) => {
		const value = resolveThemeValue(args.value);
		return (
			<RuiCycleToggle
				value={value}
				variant={args.variant}
				size={args.size}
				disabled={args.disabled}
				label={args.label}
			>
				<RuiCycleToggleItem id="system" selected={value === 'system'}>
					System
				</RuiCycleToggleItem>
				<RuiCycleToggleItem id="light" selected={value === 'light'}>
					Light
				</RuiCycleToggleItem>
				<RuiCycleToggleItem id="dark" selected={value === 'dark'}>
					Dark
				</RuiCycleToggleItem>
			</RuiCycleToggle>
		);
	},
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
	render: (args) => {
		const value = args.value || 'newest';
		return (
			<RuiCycleToggle
				value={value}
				variant={args.variant}
				size={args.size}
				disabled={args.disabled}
				label={args.label}
			>
				<RuiCycleToggleItem id="newest" selected={value === 'newest'}>
					Newest
				</RuiCycleToggleItem>
				<RuiCycleToggleItem id="oldest" selected={value === 'oldest'}>
					Oldest
				</RuiCycleToggleItem>
				<RuiCycleToggleItem id="popular" selected={value === 'popular'}>
					Popular
				</RuiCycleToggleItem>
			</RuiCycleToggle>
		);
	},
	parameters: { docs: { id: 'cycle-toggle/sort-order' } },
});
