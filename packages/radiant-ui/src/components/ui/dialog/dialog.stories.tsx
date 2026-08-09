import { radiantMeta, type StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent, fn } from 'storybook/test';
import { isStaticSsrPreview } from '@/lib/storybook-ssr';
import { dialogStage, STORY_DIALOG_ID, withDialogStage } from '../../../../.storybook/with-dialog-stage';
import { RuiButton } from '../button';
import {
	RuiDialog,
	RuiDialogActions,
	RuiDialogBody,
	RuiDialogClose,
	RuiDialogTitle,
	openDialog,
	type DialogActionDetail,
} from './index';
import { RuiDialog as RuiDialogElement } from './dialog.script';

const meta = {
	title: 'Components/Dialog',
	component: RuiDialog,
	decorators: [withDialogStage],
	args: {
		id: STORY_DIALOG_ID,
		open: false,
		alert: false,
		title: 'Edit profile',
		children: <p>Update your display name and email address.</p>,
		actions: (
			<RuiButton type="button">
				Save
			</RuiButton>
		),
	},
	render: (args) => (
		<RuiDialog id={args.id} open={args.open} alert={args.alert} title={args.title} actions={args.actions}>
			{args.children}
		</RuiDialog>
	),
};
radiantMeta(meta, { element: RuiDialogElement, stylesheets: ['./dialog.css'] });

export default meta;
type Story = StoryObj<typeof meta>;

const getDialog = (canvasElement: HTMLElement) =>
	canvasElement.querySelector(`#${STORY_DIALOG_ID} [data-ref="dialog"]`) as HTMLElement;
const getHost = (canvasElement: HTMLElement) =>
	canvasElement.querySelector(`rui-dialog#${STORY_DIALOG_ID}`) as HTMLElement;

async function openStoryDialog(canvasElement: HTMLElement): Promise<void> {
	const trigger = canvasElement.querySelector(`[data-dialog-open="${STORY_DIALOG_ID}"]`) as HTMLButtonElement | null;
	if (trigger) {
		await userEvent.click(trigger);
		return;
	}

	getHost(canvasElement).setAttribute('open', '');
}

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement) || !getHost(canvasElement)) return;

		await step('opens from decorator trigger', async () => {
			await openStoryDialog(canvasElement);
			await expect(getHost(canvasElement)).toHaveAttribute('open');
		});

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
				<RuiButton type="button" variant="ghost">
					Cancel
				</RuiButton>
				<RuiButton type="button" variant="destructive">
					Delete
				</RuiButton>
			</>
		),
	},
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement) || !getHost(canvasElement)) return;

		await openStoryDialog(canvasElement);
		const dialog = getDialog(canvasElement);

		await step('uses alertdialog role for interrupting confirmations', async () => {
			await expect(dialog).toHaveAttribute('role', 'alertdialog');
			await expect(dialog).toHaveAttribute('aria-describedby');
		});
	},
};

export const Closed: Story = {
	args: { open: false },
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement) || !getHost(canvasElement)) return;

		await step('starts closed until the decorator trigger is used', async () => {
			await expect(getHost(canvasElement)).not.toHaveAttribute('open');
		});
	},
};

export const Composed: Story = {
	render: () => (
		<RuiDialog id={STORY_DIALOG_ID} open={false} alert={false}>
			<RuiDialogClose />
			<RuiDialogTitle>Invite teammate</RuiDialogTitle>
			<RuiDialogBody>
				<p>Send an invitation link to add someone to your workspace.</p>
			</RuiDialogBody>
			<RuiDialogActions>
				<RuiButton type="button">
					Send invite
				</RuiButton>
			</RuiDialogActions>
		</RuiDialog>
	),
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement) || !getHost(canvasElement)) return;

		await openStoryDialog(canvasElement);
		const dialog = getDialog(canvasElement);
		const host = getHost(canvasElement);

		await step('composed dialog exposes expected semantics', async () => {
			await expect(dialog).toHaveAttribute('role', 'dialog');
			await expect(dialog).toHaveAttribute('aria-labelledby');
			await expect(dialog).toHaveAttribute('aria-describedby');
		});

		await step('close button dismisses the dialog', async () => {
			const close = host.querySelector('[data-dialog-close]') as HTMLButtonElement;
			await userEvent.click(close);
			await expect(host).not.toHaveAttribute('open');
		});
	},
};

export const Registry: Story = {
	parameters: dialogStage({ trigger: false }),
	render: () => (
		<>
			<RuiButton type="button" variant="outline" data-dialog-open="named-invite">
				Open named dialog
			</RuiButton>
			<RuiButton
				type="button"
				variant="destructive"
				data-ref="imperative-open"
				style="margin-left: 0.5rem"
				on:click={() => {
					openDialog({
						title: 'Delete account?',
						body: 'This action cannot be undone.',
						alert: true,
						actions: [
							{ label: 'Cancel', variant: 'ghost', value: 'cancel' },
							{ label: 'Delete', variant: 'error', value: 'delete' },
						],
					});
				}}
			>
				Open imperative confirm
			</RuiButton>
			<RuiDialog id="named-invite" open={false} title="Invite teammate">
				<p>Send an invitation link to add someone to your workspace.</p>
			</RuiDialog>
		</>
	),
	play: async ({ canvasElement, step }) => {
		const named = canvasElement.querySelector('rui-dialog#named-invite') as HTMLElement | null;
		if (isStaticSsrPreview(canvasElement) || !named) return;

		const imperativeButton = canvasElement.querySelector('[data-ref="imperative-open"]') as HTMLButtonElement;
		const actionSpy = fn<(detail: DialogActionDetail) => void>();

		const onAction = ((event: CustomEvent<DialogActionDetail>) => {
			actionSpy(event.detail);
		}) as EventListener;
		document.addEventListener('rui-dialog-action', onAction);

		await step('named dialog opens via data-dialog-open', async () => {
			await userEvent.click(
				canvasElement.querySelector('[data-dialog-open="named-invite"]') as HTMLButtonElement,
			);
			await expect(named).toHaveAttribute('open');
		});

		await step('imperative open closes the named dialog and fills the host', async () => {
			await userEvent.click(imperativeButton);
			await expect(named).not.toHaveAttribute('open');

			const host = document.querySelector('rui-dialog#__rui-dialog-host') as HTMLElement;
			await expect(host).toHaveAttribute('open');
			await expect(host.querySelector('[data-dialog-title]')?.textContent).toContain('Delete account?');
			await expect(host.querySelector('[data-dialog-body]')?.textContent).toContain('cannot be undone');
		});

		await step('host action emits rui-dialog-action and closes', async () => {
			const deleteButton = document.querySelector(
				'rui-dialog#__rui-dialog-host [data-dialog-action="delete"]',
			) as HTMLButtonElement;
			await userEvent.click(deleteButton);
			await expect(actionSpy).toHaveBeenCalledWith({ value: 'delete' });
			await expect(document.querySelector('rui-dialog#__rui-dialog-host')).toBeNull();
		});

		document.removeEventListener('rui-dialog-action', onAction);
	},
};
