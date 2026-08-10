import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiDialog } from '@ecopages/radiant-ui/dialog';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { DOCS_DIALOG_ID, withDialogStage } from '@/lib/story-decorators/with-dialog-stage';

export type DialogArgs = {
	id: string;
	open: boolean;
	alert: boolean;
	label: string;
};

export const meta = {
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
	render: (args) => (
		<RuiDialog
			id={args.id}
			open={args.open}
			alert={args.alert}
			label={args.label}
			title={args.label}
			actions={
				<>
					<RuiButton variant="ghost" type="button" data-dialog-close>
						Cancel
					</RuiButton>
					<RuiButton type="button">Save</RuiButton>
				</>
			}
		>
			Update your display name and email.
		</RuiDialog>
	),
} satisfies DocsMeta<DialogArgs>;

type Story = DocsStory<DialogArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'dialog/default' } } });
