import { RuiSeparator } from '@ecopages/radiant-ui/separator';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type SeparatorArgs = { orientation: 'horizontal' | 'vertical' };

function SeparatorPreview({ orientation }: SeparatorArgs) {
	const vertical = orientation === 'vertical';
	return (
		<div class={vertical ? 'flex h-12 items-center gap-4' : 'flex flex-col gap-3'}>
			<span>Start</span>
			<RuiSeparator orientation={orientation} />
			<span>End</span>
		</div>
	);
}

export const meta = {
	args: { orientation: 'horizontal' },
	argTypes: {
		orientation: {
			control: { type: 'select' },
			options: ['horizontal', 'vertical'],
		},
	},
	render: (args) => <SeparatorPreview orientation={args.orientation} />,
} satisfies DocsMeta<SeparatorArgs>;

type Story = DocsStory<SeparatorArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'separator/default' } } });
