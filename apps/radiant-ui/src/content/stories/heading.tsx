import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type HeadingArgs = {
	size: string;
	align: string;
};

export const meta = {
	component: 'heading',
	exportName: 'RuiHeading',
	args: {
		size: 'lg',
		align: 'start',
	},
	argTypes: {
		size: { control: { type: 'select' }, options: ['sm', 'md', 'lg', 'xl'] as const },
		align: { control: { type: 'select' }, options: ['start', 'center'] as const },
	},
	exampleCode: (args) => buildExampleCode('RuiHeading', 'heading', args),
	render: (args) => renderPlaygroundPreview('heading', args),
} satisfies DocsMeta<HeadingArgs>;

type Story = DocsStory<HeadingArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'heading/default' } } });
