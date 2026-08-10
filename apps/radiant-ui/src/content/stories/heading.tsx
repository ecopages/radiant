import {
	RuiHeading,
	type RuiHeadingAlign,
	RuiHeadingDescription,
	RuiHeadingEyebrow,
	type RuiHeadingSize,
	RuiHeadingTitle,
} from '@ecopages/radiant-ui/heading';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type HeadingArgs = {
	size: RuiHeadingSize;
	align: RuiHeadingAlign;
};

export const meta = {
	args: {
		size: 'lg',
		align: 'start',
	},
	argTypes: {
		size: {
			control: { type: 'select' },
			options: ['sm', 'md', 'lg', 'xl'] as const satisfies readonly RuiHeadingSize[],
		},
		align: { control: { type: 'select' }, options: ['start', 'center'] as const satisfies readonly RuiHeadingAlign[] },
	},
	render: (args) => (
		<RuiHeading size={args.size} align={args.align}>
			<RuiHeadingEyebrow>Components</RuiHeadingEyebrow>
			<RuiHeadingTitle>Button</RuiHeadingTitle>
			<RuiHeadingDescription>Trigger actions with clear, accessible labels.</RuiHeadingDescription>
		</RuiHeading>
	),
} satisfies DocsMeta<HeadingArgs>;

type Story = DocsStory<HeadingArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'heading/default' } } });
