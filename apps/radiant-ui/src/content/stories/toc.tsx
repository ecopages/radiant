import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type TocArgs = {
	headingSelector: string;
	label: string;
	scrollOffset: number;
};

export const meta = {
	component: 'toc',
	exportName: 'RuiToc',
	args: {
		headingSelector: 'h2,h3',
		label: 'On this page',
		scrollOffset: 80,
	},
	argTypes: {
		headingSelector: { control: { type: 'text' } },
		label: { control: { type: 'text' } },
		scrollOffset: { control: { type: 'number' } },
	},
	exampleCode: (args) => buildExampleCode('RuiToc', 'toc', args),
	render: (args) => renderPlaygroundPreview('toc', args),
} satisfies DocsMeta<TocArgs>;

type Story = DocsStory<TocArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'toc/default' } } });
