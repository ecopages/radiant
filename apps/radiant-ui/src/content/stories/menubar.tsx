import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type MenubarArgs = {
	label: string;
};

export const meta = {
	component: 'menubar',
	exportName: 'RuiMenubar',
	args: {
		label: 'Application menu',
	},
	argTypes: {
		label: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiMenubar', 'menubar', args),
	render: (args) => renderPlaygroundPreview('menubar', args),
} satisfies DocsMeta<MenubarArgs>;

type Story = DocsStory<MenubarArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'menubar/default' } } });
