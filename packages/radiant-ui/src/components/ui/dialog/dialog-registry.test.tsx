import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type JsxRenderable, type JsxRoot } from '@ecopages/jsx';
import { userEvent } from 'storybook/test';
import {
	RuiDialog,
	RUI_DIALOG_HOST_ID,
	closeDialog,
	getOpenDialogId,
	installDialogs,
	openDialog,
	uninstallDialogs,
	createDialogHandle,
	type DialogActionDetail,
} from './index';
import './dialog.script';

type DialogEl = HTMLElement & { open: boolean };

function mount(element: JsxRenderable): { host: HTMLElement; cleanup: () => void } {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const root: JsxRoot = createRoot(host);
	root.render(element);
	return {
		host,
		cleanup: () => {
			root.unmount();
			host.remove();
		},
	};
}

async function settled(): Promise<void> {
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
	await customElements.whenDefined('rui-dialog');
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
}

describe('dialog registry', () => {
	afterEach(() => {
		uninstallDialogs();
	});

	it('opens a named dialog via openDialog(id)', async () => {
		const { host, cleanup } = mount(
			<>
				<button type="button" data-dialog-open="edit-profile">
					Open
				</button>
				<RuiDialog id="edit-profile" open={false} title="Edit profile">
					<p>Update your profile.</p>
				</RuiDialog>
			</>,
		);

		installDialogs();
		await settled();

		const dialog = host.querySelector('#edit-profile') as DialogEl;
		expect(dialog.open).toBe(false);

		openDialog('edit-profile');
		await settled();

		expect(dialog.open).toBe(true);
		expect(dialog.hasAttribute('open')).toBe(true);
		expect(getOpenDialogId()).toBe('edit-profile');

		cleanup();
	});

	it('opens the host dialog with imperative content', async () => {
		installDialogs();
		await settled();

		openDialog({
			title: 'Delete account?',
			body: 'This action cannot be undone.',
			alert: true,
			actions: [
				{ label: 'Cancel', variant: 'ghost', value: 'cancel' },
				{ label: 'Delete', variant: 'error', value: 'delete' },
			],
		});
		await settled();

		const dialogHost = document.querySelector(`#${RUI_DIALOG_HOST_ID}`) as DialogEl;
		expect(dialogHost).toBeTruthy();
		expect(dialogHost.open).toBe(true);
		expect(dialogHost.hasAttribute('open')).toBe(true);
		expect(dialogHost.querySelector('[data-dialog-title]')?.textContent).toContain('Delete account?');
		expect(dialogHost.querySelector('[data-dialog-body]')?.textContent).toContain('cannot be undone');
		expect(dialogHost.querySelector('[data-ref="dialog"]')?.getAttribute('role')).toBe('alertdialog');
		expect(getOpenDialogId()).toBe(RUI_DIALOG_HOST_ID);
	});

	it('closes the previous dialog when opening another', async () => {
		const { host, cleanup } = mount(
			<>
				<RuiDialog id="one" open={false} title="One">
					<p>First</p>
				</RuiDialog>
				<RuiDialog id="two" open={false} title="Two">
					<p>Second</p>
				</RuiDialog>
			</>,
		);

		installDialogs();
		await settled();
		const one = host.querySelector('#one') as DialogEl;
		const two = host.querySelector('#two') as DialogEl;

		openDialog('one');
		await settled();
		expect(one.open).toBe(true);

		openDialog('two');
		await settled();
		expect(one.open).toBe(false);
		expect(two.open).toBe(true);
		expect(getOpenDialogId()).toBe('two');

		openDialog({ title: 'Host', body: 'Imperative' });
		await settled();
		expect(two.open).toBe(false);
		expect((document.querySelector(`#${RUI_DIALOG_HOST_ID}`) as DialogEl).open).toBe(true);

		cleanup();
	});

	it('emits rui-dialog-action and closes on host action click', async () => {
		installDialogs();
		await settled();

		const emissions: DialogActionDetail[] = [];
		document.addEventListener('rui-dialog-action', ((event: CustomEvent<DialogActionDetail>) => {
			emissions.push(event.detail);
		}) as EventListener);

		openDialog({
			title: 'Confirm',
			body: 'Proceed?',
			actions: [
				{ label: 'Cancel', variant: 'ghost', value: 'cancel' },
				{ label: 'OK', variant: 'filled', value: 'ok' },
			],
		});
		await settled();

		const ok = document.querySelector(`#${RUI_DIALOG_HOST_ID} [data-dialog-action="ok"]`) as HTMLButtonElement;
		expect(ok).toBeTruthy();
		await userEvent.click(ok);
		await settled();

		expect(emissions).toEqual([{ value: 'ok' }]);
		expect(document.querySelector(`#${RUI_DIALOG_HOST_ID}`)).toBeNull();
		expect(getOpenDialogId()).toBeNull();
	});

	it('clears openId when a dialog emits rui-close', async () => {
		const { host, cleanup } = mount(
			<RuiDialog id="profile" open={false} title="Profile">
				<p>Body</p>
			</RuiDialog>,
		);

		installDialogs();
		await settled();
		openDialog('profile');
		await settled();
		expect(getOpenDialogId()).toBe('profile');

		await userEvent.keyboard('{Escape}');
		await settled();

		expect((host.querySelector('#profile') as DialogEl).open).toBe(false);
		expect(getOpenDialogId()).toBeNull();

		cleanup();
	});

	it('opens a named dialog from data-dialog-open click', async () => {
		const { host, cleanup } = mount(
			<>
				<button type="button" data-dialog-open="settings">
					Open settings
				</button>
				<RuiDialog id="settings" open={false} title="Settings">
					<p>Prefs</p>
				</RuiDialog>
			</>,
		);

		installDialogs();
		await settled();
		const trigger = host.querySelector('[data-dialog-open="settings"]') as HTMLButtonElement;
		await userEvent.click(trigger);
		await settled();

		expect((host.querySelector('#settings') as DialogEl).open).toBe(true);
		expect(getOpenDialogId()).toBe('settings');

		closeDialog();
		await settled();
		expect((host.querySelector('#settings') as DialogEl).open).toBe(false);

		cleanup();
	});

	it('createDialogHandle returns a handle for named and imperative opens', async () => {
		const { host, cleanup } = mount(
			<RuiDialog id="ctx-dialog" open={false} title="Via handle">
				<p>Body</p>
			</RuiDialog>,
		);

		installDialogs();
		await settled();

		const named = createDialogHandle('ctx-dialog');
		named.open();
		await settled();
		expect((host.querySelector('#ctx-dialog') as DialogEl).open).toBe(true);

		named.close();
		await settled();
		expect((host.querySelector('#ctx-dialog') as DialogEl).open).toBe(false);

		const hostHandle = createDialogHandle();
		hostHandle.open({ title: 'Imperative', body: 'From handle' });
		await settled();
		expect((document.querySelector(`#${RUI_DIALOG_HOST_ID}`) as DialogEl).open).toBe(true);
		expect(document.querySelector(`#${RUI_DIALOG_HOST_ID} [data-dialog-title]`)?.textContent).toContain(
			'Imperative',
		);

		hostHandle.close();
		await settled();
		expect(getOpenDialogId()).toBeNull();

		cleanup();
	});
});
