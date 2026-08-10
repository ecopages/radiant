import { RuiHeadline, type RuiHeadlineAs, type RuiHeadlineSize } from '@ecopages/radiant-ui/headline';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type HeadlineArgs = {
	size: RuiHeadlineSize;
	as: RuiHeadlineAs;
	children: string;
};

export const meta = {
	args: {
		size: 'xl',
		as: 'h1',
		children: 'radiant UI',
	},
	argTypes: {
		size: {
			control: { type: 'select' },
			options: ['sm', 'md', 'lg', 'xl'] as const satisfies readonly RuiHeadlineSize[],
		},
		as: {
			control: { type: 'select' },
			options: ['h1', 'h2', 'h3', 'h4'] as const satisfies readonly RuiHeadlineAs[],
		},
		children: { control: { type: 'text' } },
	},
	render: (args) => (
		<RuiHeadline as={args.as} size={args.size}>
			{args.children}
		</RuiHeadline>
	),
} satisfies DocsMeta<HeadlineArgs>;

type Story = DocsStory<HeadlineArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'headline/default' } } });
