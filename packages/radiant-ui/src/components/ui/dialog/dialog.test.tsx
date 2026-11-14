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

	it('pulls focus on a control outside the actions back into the alert loop', async () => {
		const host = mount(alertDialog());
		await settled();
		const dialog = host.querySelector('rui-dialog') as DialogEl;
		dialog.alert = true;
		await settled();

		(host.querySelector('[data-test-link]') as HTMLElement).focus();
		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(host.querySelector('[data-test-confirm]'));
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

describe('RuiDialog focus handling', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('restores focus to the opener after alert toggled while open', async () => {
		const host = mount(
			<>
				<button type="button" id="opener">
					Open
				</button>
				<RuiDialog label="Delete">
					<RuiDialogActions>
						<RuiDialogClose>Cancel</RuiDialogClose>
					</RuiDialogActions>
				</RuiDialog>
			</>,
		);
		await settled();
		const opener = host.querySelector('#opener') as HTMLButtonElement;
		const dialog = host.querySelector('rui-dialog') as DialogEl;
		opener.focus();
		dialog.open = true;
		await settled();
		dialog.alert = true;
		await settled();
		dialog.open = false;
		await settled();
		expect(document.activeElement).toBe(opener);
	});

	it('does not pull focus between two open dialogs', async () => {
		const host = mount(
			<>
				<RuiDialog open label="A">
					<RuiDialogActions>
						<button type="button" id="a1">
							a1
						</button>
					</RuiDialogActions>
				</RuiDialog>
				<RuiDialog open label="B">
					<RuiDialogActions>
						<button type="button" id="b1">
							b1
						</button>
						<button type="button" id="b2">
							b2
						</button>
					</RuiDialogActions>
				</RuiDialog>
			</>,
		);
		await settled();
		(host.querySelector('#b1') as HTMLElement).focus();
		await userEvent.tab();
		expect(document.activeElement).toBe(host.querySelector('#b2'));
	});

	it('keeps natural Tab order from the surface in a non-alert dialog', async () => {
		const host = mount(
			<RuiDialog open label="Plain">
				<button type="button" id="p1">
					p1
				</button>
			</RuiDialog>,
		);
		await settled();
		(host.querySelector('[data-ref="dialog"]') as HTMLElement).focus();
		await userEvent.tab();
		expect(document.activeElement).toBe(host.querySelector('#p1'));
	});

	it('falls back to the whole surface when an alert dialog has no actions', async () => {
		const host = mount(
			<RuiDialog open alert label="Bare">
				<button type="button" id="x1">
					x1
				</button>
				<button type="button" id="x2">
					x2
				</button>
			</RuiDialog>,
		);
		await settled();
		(host.querySelector('#x2') as HTMLElement).focus();
		await userEvent.tab();
		expect(document.activeElement).toBe(host.querySelector('#x1'));
	});
});

describe('RuiDialog scroll lock', () => {
	afterEach(() => {
		document.body.innerHTML = '';
		document.documentElement.removeAttribute('style');
	});

	it('locks page scroll while open and releases it on close and on removal', async () => {
		const host = mount(
			<>
				<RuiDialog label="A" id="a" />
				<RuiDialog label="B" id="b" />
			</>,
		);
		await settled();
		const a = host.querySelector('#a') as DialogEl;
		const b = host.querySelector('#b') as DialogEl;
		expect(document.documentElement.style.overflow).toBe('');

		a.open = true;
		b.open = true;
		await settled();
		expect(document.documentElement.style.overflow).toBe('hidden');

		a.open = false;
		await settled();
		expect(document.documentElement.style.overflow).toBe('hidden');

		b.remove();
		await settled();
		expect(document.documentElement.style.overflow).toBe('');
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

	it('treats false and empty children as icon-only', async () => {
		const host = mount(<RuiDialogClose>{false}</RuiDialogClose>);
		await settled();
		const button = host.querySelector('button') as HTMLButtonElement;
		expect(button.getAttribute('aria-label')).toBe('Close');
		expect(button.querySelector('svg')).not.toBeNull();
	});

	it('keeps an explicit aria label', async () => {
		const host = mount(<RuiDialogClose aria={{ label: 'Dismiss' }}>Cancel</RuiDialogClose>);
		await settled();
		expect((host.querySelector('button') as HTMLButtonElement).getAttribute('aria-label')).toBe('Dismiss');
	});
});
