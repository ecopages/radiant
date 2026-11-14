import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/modal.css';
import { mountForm, trackListeners, type Form } from './mount-recipe';

const status = (root: HTMLElement) => root.querySelector('[data-status]')!.textContent;

afterEach(() => {
	document.body.innerHTML = '';
	document.documentElement.removeAttribute('style');
});

const names = (root: HTMLElement) =>
	[...root.querySelectorAll('[data-list] li')].map((row) => row.firstElementChild!.textContent);
const deleteOf = (root: HTMLElement, index: number) =>
	root.querySelectorAll<HTMLElement>('[data-list] [data-delete]')[index]!;

describe.each<Form>(['plain', 'radiant'])('modal, %s form', (form) => {
	test('traps focus, locks scroll and closes three ways, returning focus to the Delete button that opened it', async () => {
		const root = await mountForm('modal', form);
		const layer = root.querySelector<HTMLElement>('[data-layer]')!;
		const dialog = root.querySelector<HTMLElement>('[data-dialog]')!;
		const origin = layer.parentElement!;
		const [cancel, confirm] = dialog.querySelectorAll<HTMLElement>('button');
		const report = deleteOf(root, 1);

		await userEvent.click(report);
		expect(layer.hidden).toBe(false);
		expect(layer.parentElement).toBe(root);
		expect(dialog.querySelector('h3')!.textContent).toBe('Delete Report?');
		expect(status(root)).toBe('Delete Report?');
		expect(document.documentElement.style.overflow).toBe('hidden');
		await expect.poll(() => document.activeElement).toBe(cancel);

		await userEvent.tab();
		expect(document.activeElement).toBe(confirm);
		await userEvent.tab();
		expect(document.activeElement).toBe(cancel);

		await userEvent.keyboard('{Escape}');
		expect(layer.hidden).toBe(true);
		expect(layer.parentElement).toBe(origin);
		expect(document.documentElement.style.overflow).toBe('');
		expect(document.activeElement).toBe(report);
		expect(status(root)).toBe('Kept Report');

		await userEvent.click(report);
		await userEvent.click(cancel);
		expect(layer.hidden).toBe(true);
		expect(document.activeElement).toBe(report);
		expect(names(root)).toEqual(['Brief', 'Report', 'Notes']);

		await userEvent.click(report);
		layer.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1 }));
		expect(layer.hidden).toBe(true);
		expect(document.activeElement).toBe(report);
		expect(status(root)).toBe('Kept Report');
	});

	test('deleting a file removes it and moves focus to the next file, the previous one for the last, then Reset', async () => {
		const root = await mountForm('modal', form);
		const confirm = root.querySelector<HTMLElement>('[data-confirm]')!;
		const empty = root.querySelector<HTMLElement>('[data-empty]')!;
		const reset = root.querySelector<HTMLElement>('[data-reset]')!;
		expect(empty.hidden).toBe(true);

		await userEvent.click(deleteOf(root, 1));
		await userEvent.click(confirm);
		expect(names(root)).toEqual(['Brief', 'Notes']);
		expect(document.activeElement).toBe(deleteOf(root, 1));
		expect(deleteOf(root, 1).getAttribute('aria-label')).toBe('Delete Notes');
		expect(status(root)).toBe('Deleted Report, 2 left');

		await userEvent.click(deleteOf(root, 1));
		await userEvent.click(confirm);
		expect(names(root)).toEqual(['Brief']);
		expect(document.activeElement).toBe(deleteOf(root, 0));

		await userEvent.click(deleteOf(root, 0));
		await userEvent.click(confirm);
		expect(names(root)).toEqual([]);
		expect(empty.hidden).toBe(false);
		expect(document.activeElement).toBe(reset);
		expect(status(root)).toBe('Deleted Brief, 0 left');

		await userEvent.click(reset);
		expect(names(root)).toEqual(['Brief', 'Report', 'Notes']);
		expect(empty.hidden).toBe(true);
		expect(document.activeElement).toBe(deleteOf(root, 0));
		expect(status(root)).toBe('List restored');

		await userEvent.click(deleteOf(root, 2));
		await userEvent.click(confirm);
		expect(document.activeElement).toBe(deleteOf(root, 1));
		expect(names(root)).toEqual(['Brief', 'Report']);
	});

	test('locks the docs article column and not the page when the example sits in one', async () => {
		const root = await mountForm('modal', form);
		const column = document.createElement('div');
		column.className = 'docs-layout__content';
		root.replaceWith(column);
		column.append(root);

		await userEvent.click(root.querySelector<HTMLElement>('[data-delete]')!);
		expect(column.style.overflow).toBe('hidden');
		expect(document.documentElement.style.overflow).toBe('');

		await userEvent.keyboard('{Escape}');
		expect(column.style.overflow).toBe('');
	});

	test('covers the example frame with a backdrop and a panel inside it', async () => {
		const root = await mountForm('modal', form);
		const frame = form === 'plain' ? root : document.createElement('div');
		if (form === 'plain') {
			frame.classList.add('primitive-example');
		} else {
			frame.className = 'primitive-example';
			frame.dataset.host = '';
			root.replaceWith(frame);
			frame.append(root);
		}
		const layer = root.querySelector<HTMLElement>('[data-layer]')!;
		const dialog = root.querySelector<HTMLElement>('[data-dialog]')!;

		await userEvent.click(root.querySelector<HTMLElement>('[data-delete]')!);

		expect(getComputedStyle(layer).position).toBe('absolute');
		const area = layer.getBoundingClientRect();
		const frameArea = frame.getBoundingClientRect();
		expect([area.x, area.y, area.width, area.height]).toEqual([
			frameArea.x,
			frameArea.y,
			frameArea.width,
			frameArea.height,
		]);
		expect(dialog.getBoundingClientRect().width).toBeLessThanOrEqual(area.width);
	});
});

test('modal Radiant form releases the scroll lock and the document listeners when the element leaves while open', async () => {
	const tracker = trackListeners();
	let root: HTMLElement;
	try {
		root = await mountForm('modal', 'radiant');
		const before = tracker.live(document);
		await userEvent.click(root.querySelector<HTMLElement>('[data-delete]')!);
		expect(document.documentElement.style.overflow).toBe('hidden');
		expect(tracker.live(document).length).toBeGreaterThan(before.length);

		root.remove();
		expect(tracker.live(document)).toEqual(before);
		expect(document.documentElement.style.overflow).toBe('');
	} finally {
		tracker.stop();
	}

	const fresh = root.cloneNode(true) as HTMLElement;
	document.body.append(fresh);
	await expect.poll(() => fresh.querySelector<HTMLElement>('[data-layer]')!.hidden).toBe(true);
	await userEvent.click(fresh.querySelector<HTMLElement>('[data-delete]')!);
	expect(fresh.querySelector<HTMLElement>('[data-layer]')!.hidden).toBe(false);
	await userEvent.keyboard('{Escape}');
	expect(status(fresh)).toBe('Kept Brief');
});
