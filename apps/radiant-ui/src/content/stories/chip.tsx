import type { RuiChipVariant } from '@ecopages/radiant-ui/chip';
import { RuiChip } from '@ecopages/radiant-ui/chip';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type ChipArgs = {
	variant: RuiChipVariant;
	children: string;
};

export const meta = {
	component: 'chip',
	exportName: 'RuiChip',
	args: { variant: 'default', children: 'Design system' },
	argTypes: {
		variant: {
			control: { type: 'select' },
			options: ['default', 'muted', 'primary'] as const satisfies readonly RuiChipVariant[],
		},
		children: { control: { type: 'text' } },
	},
	render: (args) => <RuiChip variant={args.variant}>{args.children}</RuiChip>,
} satisfies DocsMeta<ChipArgs>;

type Story = DocsStory<ChipArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'chip/default' } } });

export const Primary: Story = docsStory(meta, {
	args: { variant: 'primary', children: 'Active filter' },
	parameters: { docs: { id: 'chip/primary' } },
});
