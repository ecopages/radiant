import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type GridArgs = {
	label: string;
};

export const meta = {
	component: 'grid',
	exportName: 'RuiGrid',
	args: {
		label: 'Team members',
	},
	argTypes: {
		label: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiGrid', 'grid', args),
	render: (args) => renderPlaygroundPreview('grid', args),
} satisfies DocsMeta<GridArgs>;

type Story = DocsStory<GridArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'grid/default' } } });
