import { RuiSeparator } from '@ecopages/radiant-ui/separator';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type SeparatorArgs = { orientation: 'horizontal' | 'vertical' };

export const meta = {
	args: { orientation: 'horizontal' },
	argTypes: {
		orientation: {
			control: { type: 'select' },
			options: ['horizontal', 'vertical'],
		},
	},
	render: (args) => (
		<div class="flex h-16 w-64 items-center gap-4 rounded-container border border-border bg-surface p-4">
			<span>Start</span>
			<RuiSeparator orientation={args.orientation} />
			<span>End</span>
		</div>
	),
} satisfies DocsMeta<SeparatorArgs>;

type Story = DocsStory<SeparatorArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'separator/default' } } });
