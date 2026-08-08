import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type TreeArgs = {
	value: string;
	label: string;
};

export const meta = {
	component: 'tree',
	exportName: 'RuiTree',
	args: {
		value: 'button',
		label: 'Project files',
	},
	argTypes: {
		value: { control: { type: 'text' } },
		label: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiTree', 'tree', args),
	render: (args) => renderPlaygroundPreview('tree', args),
} satisfies DocsMeta<TreeArgs>;

type Story = DocsStory<TreeArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'tree/default' } } });
