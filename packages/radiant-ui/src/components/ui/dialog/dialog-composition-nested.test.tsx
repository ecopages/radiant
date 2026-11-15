import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { RuiDialog, RuiDialogClose } from './dialog';
import {
	isReachable,
	describeHit,
	mountOpenDialog,
	settled,
	type DialogEl,
	type Page,
} from './dialog-composition.harness';

let page: Page;

afterEach(() => {
	page?.cleanup();
});

async function mountNested(): Promise<{ inner: DialogEl; openInner: HTMLButtonElement }> {
	page = await mountOpenDialog(
		<>
			<button
				type="button"
				id="open-inner"
				on:click={() => {
					(document.getElementById('inner') as DialogEl).open = true;
				}}
			>
				Open inner
			</button>
			<RuiDialog id="inner" label="Inner dialog">
				<button type="button" id="inner-a">
					Inner A
				</button>
				<button type="button" id="inner-b">
					Inner B
				</button>
				<RuiDialogClose>Close inner</RuiDialogClose>
			</RuiDialog>
		</>,
	);
	const openInner = page.dialog.querySelector('#open-inner') as HTMLButtonElement;
	await userEvent.click(openInner);
	await settled();
	const inner = page.dialog.querySelector('#inner') as DialogEl;
	expect(inner.open).toBe(true);
	return { inner, openInner };
}

describe('a nested rui-dialog inside a modal rui-dialog', () => {
	it('renders above the outer dialog and moves focus into itself', async () => {
		const { inner } = await mountNested();
		const surface = inner.querySelector('[data-ref="dialog"]') as HTMLElement;
		expect(isReachable(surface), `the pointer reaches ${describeHit(surface)}`).toBe(true);
		expect(inner.contains(document.activeElement)).toBe(true);
	});

	it('keeps Tab and Shift+Tab inside the inner dialog', async () => {
		const { inner } = await mountNested();
		for (let step = 0; step < 8; step++) {
			await userEvent.tab();
			expect(inner.contains(document.activeElement), `Tab ${step}`).toBe(true);
		}
		for (let step = 0; step < 8; step++) {
			await userEvent.tab({ shift: true });
			expect(inner.contains(document.activeElement), `Shift+Tab ${step}`).toBe(true);
		}
	});

	it('closes the inner dialog first on Escape, returns focus to its opener, then the outer one', async () => {
		const { inner, openInner } = await mountNested();
		await userEvent.keyboard('{Escape}');
		await settled();
		expect(inner.open).toBe(false);
		expect(page.dialog.open).toBe(true);
		expect(document.activeElement).toBe(openInner);

		await userEvent.keyboard('{Escape}');
		await settled();
		expect(page.dialog.open).toBe(false);
		expect(document.activeElement).toBe(page.opener);
	});

	it('keeps the page locked until the last dialog closes', async () => {
		const { inner } = await mountNested();
		expect(document.documentElement.style.overflow).toBe('hidden');
		inner.open = false;
		await settled();
		expect(document.documentElement.style.overflow).toBe('hidden');
		page.dialog.open = false;
		await settled();
		expect(document.documentElement.style.overflow).toBe('');
	});

	it('closes only the inner dialog on a click on the inner close button', async () => {
		const { inner, openInner } = await mountNested();
		await userEvent.click(inner.querySelector('[data-dialog-close]') as HTMLElement);
		await settled();
		expect(inner.open).toBe(false);
		expect(page.dialog.open).toBe(true);
		expect(document.activeElement).toBe(openInner);
	});

	it('closes only the inner dialog on a click on the inner backdrop', async () => {
		const { inner } = await mountNested();
		const backdrop = inner.querySelector('[data-ref="backdrop"]') as HTMLElement;
		await userEvent.click(backdrop, { position: { x: 4, y: backdrop.getBoundingClientRect().height - 4 } });
		await settled();
		expect(inner.open).toBe(false);
		expect(page.dialog.open).toBe(true);
	});

	it('is closed by a data-dialog-open trigger of another dialog, because the registry keeps one dialog open', async () => {
		page = await mountOpenDialog(
			<>
				<button type="button" id="open-other" data-dialog-open="other">
					Open other
				</button>
				<RuiDialog id="other" label="Other" />
			</>,
		);
		await userEvent.click(page.dialog.querySelector('#open-other') as HTMLElement);
		await settled();
		expect((document.getElementById('other') as DialogEl).open).toBe(true);
		expect(page.dialog.open).toBe(false);
	});

	it('leaves no scroll lock when both dialogs are removed while open', async () => {
		const { inner } = await mountNested();
		inner.remove();
		page.dialog.remove();
		await settled();
		expect(document.documentElement.style.overflow).toBe('');
	});
});
