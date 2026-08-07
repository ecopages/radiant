import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type DialogArgs = {
	open: boolean;
	alert: boolean;
	label: string;
};

export const meta = {
	component: 'dialog',
	exportName: 'RuiDialog',
	args: {
		open: false,
		alert: false,
		label: 'Edit profile',
	},
	argTypes: {
		open: { control: { type: 'boolean' } },
		alert: { control: { type: 'boolean' } },
		label: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiDialog', 'dialog', args),
	render: (args) => renderPlaygroundPreview('dialog', args),
} satisfies DocsMeta<DialogArgs>;

type Story = DocsStory<DialogArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'dialog/default' } } });
