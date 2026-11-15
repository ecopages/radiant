import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { RuiDialogActions, RuiDialogClose } from './dialog';
import { mountOpenDialog, settled, isReachable, type Page } from './dialog-composition.harness';

describe('RuiDialogClose in a real browser', () => {
	let page: Page | undefined;

	afterEach(() => {
		page?.cleanup();
		page = undefined;
	});

	it('with text is an in-flow ghost button that shares a row with another action', async () => {
		page = await mountOpenDialog(
			<RuiDialogActions>
				<RuiDialogClose data-test-cancel>Cancel</RuiDialogClose>
				<button type="button" data-test-confirm>
					Confirm
				</button>
			</RuiDialogActions>,
		);
		const cancel = page.dialog.querySelector('[data-test-cancel]') as HTMLButtonElement;
		const confirm = page.dialog.querySelector('[data-test-confirm]') as HTMLButtonElement;
		expect(getComputedStyle(cancel).position).toBe('static');
		expect(cancel.classList.contains('rui-dialog__close')).toBe(false);
		expect(cancel.classList.contains('rui-button')).toBe(true);
		expect(cancel.classList.contains('rui-button--ghost')).toBe(true);
		expect(cancel.getAttribute('data-ref')).toBe('close');
		expect(cancel.hasAttribute('aria-label')).toBe(false);
		const a = cancel.getBoundingClientRect();
		const b = confirm.getBoundingClientRect();
		expect(Math.abs(a.top - b.top)).toBeLessThan(a.height);
		expect(a.right <= b.left || b.right <= a.left).toBe(true);
		expect(isReachable(cancel)).toBe(true);
		await userEvent.click(cancel);
		await settled();
		expect(page.dialog.open).toBe(false);
	});

	it('without children stays the absolutely positioned corner icon button', async () => {
		page = await mountOpenDialog(<RuiDialogClose data-test-x />);
		const close = page.dialog.querySelector('[data-test-x]') as HTMLButtonElement;
		expect(getComputedStyle(close).position).toBe('absolute');
		expect(close.classList.contains('rui-dialog__close')).toBe(true);
		expect(close.getAttribute('aria-label')).toBe('Close');
		const surface = page.surface.getBoundingClientRect();
		const box = close.getBoundingClientRect();
		expect(surface.right - box.right).toBeLessThan(24);
		expect(box.top - surface.top).toBeLessThan(24);
		await userEvent.click(close);
		await settled();
		expect(page.dialog.open).toBe(false);
	});
});
