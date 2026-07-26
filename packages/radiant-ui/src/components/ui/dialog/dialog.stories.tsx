import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiDialog, RuiDialogActions, RuiDialogBody, RuiDialogClose, RuiDialogTitle } from './dialog';

const meta = {
	title: 'Components/Dialog',
	component: RuiDialog,
	args: {
		open: true,
		alert: false,
		title: 'Edit profile',
		children: <p>Update your display name and email address.</p>,
		actions: (
			<button type="button" class="rui-button rui-button--primary rui-button--md">
				Save
			</button>
		),
	},
} satisfies Meta<typeof RuiDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const getDialog = (canvasElement: HTMLElement) => canvasElement.querySelector('[data-ref="dialog"]') as HTMLElement;
const getHost = (canvasElement: HTMLElement) => canvasElement.querySelector('rui-dialog') as HTMLElement;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const dialog = getDialog(canvasElement);
		const host = getHost(canvasElement);

		await step('exposes role=dialog with aria-modal', async () => {
			await expect(dialog).toHaveAttribute('role', 'dialog');
			await expect(dialog).toHaveAttribute('aria-modal', 'true');
			await expect(dialog).toHaveAttribute('aria-labelledby');
		});

		await step('Escape closes the dialog', async () => {
			await userEvent.keyboard('{Escape}');
			await expect(host).not.toHaveAttribute('open');
		});
	},
};

export const AlertDialog: Story = {
	args: {
		alert: true,
		title: 'Delete account?',
		children: <p>This action cannot be undone. All data will be permanently removed.</p>,
		actions: (
			<>
				<button type="button" class="rui-button rui-button--ghost rui-button--md">
					Cancel
				</button>
				<button type="button" class="rui-button rui-button--error rui-button--md">
					Delete
				</button>
			</>
		),
	},
	play: async ({ canvasElement, step }) => {
		const dialog = getDialog(canvasElement);

		await step('uses alertdialog role for interrupting confirmations', async () => {
			await expect(dialog).toHaveAttribute('role', 'alertdialog');
			await expect(dialog).toHaveAttribute('aria-describedby');
		});
	},
};

export const Closed: Story = {
	args: { open: false },
};

export const Composed: Story = {
	render: () => (
		<RuiDialog open alert={false}>
			<RuiDialogClose />
			<RuiDialogTitle>Invite teammate</RuiDialogTitle>
			<RuiDialogBody>
				<p>Send an invitation link to add someone to your workspace.</p>
			</RuiDialogBody>
			<RuiDialogActions>
				<button type="button" class="rui-button rui-button--primary rui-button--md">
					Send invite
				</button>
			</RuiDialogActions>
		</RuiDialog>
	),
	play: async ({ canvasElement, step }) => {
		const dialog = getDialog(canvasElement);
		const host = getHost(canvasElement);

		await step('composed dialog exposes expected semantics', async () => {
			await expect(dialog).toHaveAttribute('role', 'dialog');
			await expect(dialog).toHaveAttribute('aria-labelledby');
			await expect(dialog).toHaveAttribute('aria-describedby');
		});

		await step('close button dismisses the dialog', async () => {
			const close = canvasElement.querySelector('[data-dialog-close]') as HTMLButtonElement;
			await userEvent.click(close);
			await expect(host).not.toHaveAttribute('open');
		});
	},
};
