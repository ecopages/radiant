import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsDecorator, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';
import { installDialogs } from '@ecopages/radiant-ui/dialog';

const DOCS_DIALOG_ID = 'docs-dialog';

const withDialogTrigger: DocsDecorator<DialogArgs> = (story) => {
	installDialogs();

	return (
		<>
			<button
				type="button"
				class="rui-button rui-button--filled rui-button--md"
				data-dialog-open={DOCS_DIALOG_ID}
			>
				Open dialog
			</button>
			<div style="margin-top: 1rem">{story()}</div>
		</>
	);
};

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
	decorators: [withDialogTrigger],
	exampleCode: (args) => buildExampleCode('RuiDialog', 'dialog', args),
	render: (args) => renderPlaygroundPreview('dialog', args),
} satisfies DocsMeta<DialogArgs>;

type Story = DocsStory<DialogArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'dialog/default' } } });
