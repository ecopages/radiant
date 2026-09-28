import type { RuiBadgeVariant } from '@ecopages/radiant-ui/badge';
import { RuiBadge } from '@ecopages/radiant-ui/badge';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type BadgeArgs = {
	variant: RuiBadgeVariant;
	children: string;
};

export const meta = {
	args: { variant: 'filled', children: 'Beta' },
	argTypes: {
		variant: {
			control: { type: 'select' },
			options: [
				'filled',
				'outline',
				'destructive',
				'ghost',
				'muted',
			] as const satisfies readonly RuiBadgeVariant[],
		},
		children: { control: { type: 'text' } },
	},
	render: (args) => <RuiBadge variant={args.variant}>{args.children}</RuiBadge>,
} satisfies DocsMeta<BadgeArgs>;

type Story = DocsStory<BadgeArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'badge/default' } } });

export const Destructive: Story = docsStory(meta, {
	args: { variant: 'destructive', children: 'Error' },
	parameters: { docs: { id: 'badge/destructive' } },
});
