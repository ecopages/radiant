import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type HeadlineArgs = {
	size: string;
	as: string;
	children: string;
};

export const meta = {
	component: 'headline',
	exportName: 'RuiHeadline',
	args: {
		size: 'xl',
		as: 'h1',
		children: 'Radiant UI',
	},
	argTypes: {
		size: { control: { type: 'select' }, options: ['sm', 'md', 'lg', 'xl'] as const },
		as: { control: { type: 'select' }, options: ['h1', 'h2', 'h3', 'h4'] as const },
		children: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiHeadline', 'headline', args, args.children),
	render: (args) => renderPlaygroundPreview('headline', args, args.children),
} satisfies DocsMeta<HeadlineArgs>;

type Story = DocsStory<HeadlineArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'headline/default' } } });
