import { RuiWindowSplitter } from '@ecopages/radiant-ui/window-splitter';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type WindowSplitterArgs = {
	value: number;
	orientation: 'horizontal' | 'vertical';
	label: string;
};

export const meta = {
	args: {
		value: 50,
		orientation: 'horizontal',
		label: 'Split view',
	},
	argTypes: {
		value: { control: { type: 'number' } },
		orientation: {
			control: { type: 'select' },
			options: ['horizontal', 'vertical'] as const satisfies readonly WindowSplitterArgs['orientation'][],
		},
		label: { control: { type: 'text' } },
	},
	render: (args) => (
		<RuiWindowSplitter
			value={args.value}
			orientation={args.orientation}
			label={args.label}
			primary={<div>Editor</div>}
			secondary={<div>Preview</div>}
		/>
	),
} satisfies DocsMeta<WindowSplitterArgs>;

type Story = DocsStory<WindowSplitterArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'window-splitter/default' } } });
