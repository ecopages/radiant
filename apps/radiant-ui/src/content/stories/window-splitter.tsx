import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type WindowSplitterArgs = {
	value: number;
	orientation: string;
	label: string;
};

export const meta = {
	component: 'window-splitter',
	exportName: 'RuiWindowSplitter',
	args: {
		value: 50,
		orientation: 'horizontal',
		label: 'Split view',
	},
	argTypes: {
		value: { control: { type: 'number' } },
		orientation: { control: { type: 'select' }, options: ['horizontal', 'vertical'] as const },
		label: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiWindowSplitter', 'window-splitter', args),
	render: (args) => renderPlaygroundPreview('window-splitter', args),
} satisfies DocsMeta<WindowSplitterArgs>;

type Story = DocsStory<WindowSplitterArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'window-splitter/default' } } });
