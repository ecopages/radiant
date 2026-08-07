import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type TreegridArgs = {
	value: string;
	label: string;
};

export const meta = {
	component: 'treegrid',
	exportName: 'RuiTreegrid',
	args: {
		value: 'intro',
		label: 'Repository',
	},
	argTypes: {
		value: { control: { type: 'text' } },
		label: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiTreegrid', 'treegrid', args),
	render: (args) => renderPlaygroundPreview('treegrid', args),
} satisfies DocsMeta<TreegridArgs>;

type Story = DocsStory<TreegridArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'treegrid/default' } } });
