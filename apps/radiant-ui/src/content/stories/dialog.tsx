import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';
import { DOCS_DIALOG_ID, withDialogStage } from '@/lib/story-decorators/with-dialog-stage';

export type DialogArgs = {
	id: string;
	open: boolean;
	alert: boolean;
	label: string;
};

export const meta = {
	component: 'dialog',
	exportName: 'RuiDialog',
	args: {
		id: DOCS_DIALOG_ID,
		open: false,
		alert: false,
		label: 'Edit profile',
	},
	argTypes: {
		open: { control: { type: 'boolean' } },
		alert: { control: { type: 'boolean' } },
		label: { control: { type: 'text' } },
	},
	decorators: [withDialogStage()],
	exampleCode: (args) => buildExampleCode('RuiDialog', 'dialog', args),
	render: (args) => renderPlaygroundPreview('dialog', args),
} satisfies DocsMeta<DialogArgs>;

type Story = DocsStory<DialogArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'dialog/default' } } });
