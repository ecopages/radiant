import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type ToolbarArgs = {
	exclusiveToggles: boolean;
	label: string;
};

export const meta = {
	component: 'toolbar',
	exportName: 'RuiToolbar',
	args: {
		exclusiveToggles: false,
		label: 'Text formatting',
	},
	argTypes: {
		exclusiveToggles: { control: { type: 'boolean' } },
		label: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiToolbar', 'toolbar', args),
	render: (args) => renderPlaygroundPreview('toolbar', args),
} satisfies DocsMeta<ToolbarArgs>;

type Story = DocsStory<ToolbarArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'toolbar/default' } } });
