import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type TocArgs = {
	target: string;
	headingSelector: string;
	label: string;
	scrollOffset: number;
};

export const meta = {
	component: 'toc',
	exportName: 'RuiToc',
	args: {
		target: '.docs-content',
		headingSelector: 'h2,h3',
		label: 'On this page',
		scrollOffset: 120,
	},
	argTypes: {
		target: { control: { type: 'text' } },
		headingSelector: { control: { type: 'text' } },
		label: { control: { type: 'text' } },
		scrollOffset: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiToc', 'toc', args),
	render: (args) => renderPlaygroundPreview('toc', args),
} satisfies DocsMeta<TocArgs>;

type Story = DocsStory<TocArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'toc/default' } } });
