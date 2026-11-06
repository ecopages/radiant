import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import { RuiDialog, RuiDialogActions, RuiDialogBody, RuiDialogClose } from './dialog';
import { RuiDialog as RuiDialogScript } from './dialog.script';
void RuiDialogScript;

type DialogEl = HTMLElement & { open: boolean; alert: boolean };

function mount(element: JsxRenderable): HTMLElement {
	const host = document.createElement('div');
	document.body.appendChild(host);
	createRoot(host).render(element);
	return host;
}

async function settled(): Promise<void> {
	await customElements.whenDefined('rui-dialog');
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
}

describe('RuiDialog host alert', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	function alertDialog() {
		return (
			<RuiDialog open label="Delete">
				<a href="#top" data-test-link>
					Docs
				</a>
				<RuiDialogBody>Sure?</RuiDialogBody>
				<RuiDialogActions>
					<RuiDialogClose>Cancel</RuiDialogClose>
					<button type="button" data-test-confirm>
						Delete
					</button>
				</RuiDialogActions>
			</RuiDialog>
		);
	}

	it('limits the tab loop to the actions when alert is set on the host', async () => {
		const host = mount(alertDialog());
		await settled();
		const dialog = host.querySelector('rui-dialog') as DialogEl;
		dialog.alert = true;
		await settled();

		const cancel = host.querySelector('[data-dialog-close]') as HTMLElement;
		const confirm = host.querySelector('[data-test-confirm]') as HTMLElement;
		cancel.focus();

		await userEvent.tab();
		expect(document.activeElement).toBe(confirm);
		await userEvent.tab();
		expect(document.activeElement).toBe(cancel);
		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(confirm);
	});

	it('keeps every focusable in the loop when alert is off', async () => {
		const host = mount(alertDialog());
		await settled();
		const link = host.querySelector('[data-test-link]') as HTMLElement;
		const confirm = host.querySelector('[data-test-confirm]') as HTMLElement;
		confirm.focus();
		await userEvent.tab();
		expect(document.activeElement).toBe(link);
	});

	it('drives the surface role from the host alert live', async () => {
		const host = mount(alertDialog());
		await settled();
		const dialog = host.querySelector('rui-dialog') as DialogEl;
		const surface = host.querySelector('[data-ref="dialog"]') as HTMLElement;
		expect(surface.getAttribute('role')).toBe('dialog');

		dialog.alert = true;
		await settled();
		expect(surface.getAttribute('role')).toBe('alertdialog');

		dialog.alert = false;
		await settled();
		expect(surface.getAttribute('role')).toBe('dialog');
	});
});

describe('RuiDialogClose label', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('does not override visible text with a Close aria-label', async () => {
		const host = mount(<RuiDialogClose>Cancel</RuiDialogClose>);
		await settled();
		const button = host.querySelector('button') as HTMLButtonElement;
		expect(button.hasAttribute('aria-label')).toBe(false);
		expect(button.textContent?.trim()).toBe('Cancel');
	});

	it('labels the icon-only close button Close', async () => {
		const host = mount(<RuiDialogClose />);
		await settled();
		expect((host.querySelector('button') as HTMLButtonElement).getAttribute('aria-label')).toBe('Close');
	});

	it('keeps an explicit aria label', async () => {
		const host = mount(<RuiDialogClose aria={{ label: 'Dismiss' }}>Cancel</RuiDialogClose>);
		await settled();
		expect((host.querySelector('button') as HTMLButtonElement).getAttribute('aria-label')).toBe('Dismiss');
	});
});
