import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/modal.css';
import { mountComponent, trackListeners } from './mount-recipe';

afterEach(() => {
	document.body.innerHTML = '';
	document.documentElement.removeAttribute('style');
});

describe('modal component', () => {
	const status = (root: HTMLElement) => root.querySelector('[data-status]')!.textContent;
	const names = (root: HTMLElement) =>
		[...root.querySelectorAll('[data-list] li')].map((row) => row.firstElementChild!.textContent);
	const deleteOf = (root: HTMLElement, index: number) =>
		root.querySelectorAll<HTMLElement>('[data-list] [data-delete]')[index]!;
	const layer = (root: HTMLElement) => root.querySelector<HTMLElement>('[data-layer]')!;
	const ready = async (root: HTMLElement) => {
		await expect.poll(() => root.querySelectorAll('[data-list] li')).toHaveLength(3);
		return root;
	};

	test('draws the files, the dialog and the status from its state', async () => {
		const root = await ready(await mountComponent('modal'));

		expect(names(root)).toEqual(['Brief', 'Report', 'Notes']);
		expect(layer(root).hidden).toBe(true);
		expect(root.querySelector<HTMLElement>('[data-empty]')!.hidden).toBe(true);
		expect(status(root)).toBe('Delete a file to see where focus goes');
	});

	test('traps focus, locks scroll and closes three ways, returning focus to the Delete button that opened it', async () => {
		const root = await ready(await mountComponent('modal'));
		const dialog = root.querySelector<HTMLElement>('[data-dialog]')!;
		const [cancel, confirm] = dialog.querySelectorAll<HTMLElement>('button');
		const report = deleteOf(root, 1);

		await userEvent.click(report);
		await expect.poll(() => layer(root).hidden).toBe(false);
		expect(layer(root).parentElement).toBe(root);
		expect(dialog.querySelector('h3')!.textContent).toBe('Delete Report?');
		expect(status(root)).toBe('Delete Report?');
		expect(document.documentElement.style.overflow).toBe('hidden');
		await expect.poll(() => document.activeElement).toBe(cancel);

		await userEvent.tab();
		expect(document.activeElement).toBe(confirm);
		await userEvent.tab();
		expect(document.activeElement).toBe(cancel);

		await userEvent.keyboard('{Escape}');
		await expect.poll(() => layer(root).hidden).toBe(true);
		expect(layer(root).parentElement).not.toBe(root);
		expect(document.documentElement.style.overflow).toBe('');
		await expect.poll(() => document.activeElement).toBe(deleteOf(root, 1));
		expect(status(root)).toBe('Kept Report');

		await userEvent.click(deleteOf(root, 1));
		await userEvent.click(cancel);
		await expect.poll(() => layer(root).hidden).toBe(true);
		await expect.poll(() => document.activeElement).toBe(deleteOf(root, 1));
		expect(names(root)).toEqual(['Brief', 'Report', 'Notes']);

		await userEvent.click(deleteOf(root, 1));
		layer(root).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1 }));
		await expect.poll(() => layer(root).hidden).toBe(true);
		await expect.poll(() => document.activeElement).toBe(deleteOf(root, 1));
		expect(status(root)).toBe('Kept Report');
	});

	test('deleting a file removes it and moves focus to the next file, the previous one for the last, then Reset', async () => {
		const root = await ready(await mountComponent('modal'));
		const confirm = root.querySelector<HTMLElement>('[data-confirm]')!;
		const reset = root.querySelector<HTMLElement>('[data-reset]')!;
		const empty = root.querySelector<HTMLElement>('[data-empty]')!;

		await userEvent.click(deleteOf(root, 1));
		await userEvent.click(confirm);
		await expect.poll(() => names(root)).toEqual(['Brief', 'Notes']);
		await expect.poll(() => document.activeElement).toBe(deleteOf(root, 1));
		expect(status(root)).toBe('Deleted Report, 2 left');

		await userEvent.click(deleteOf(root, 1));
		await userEvent.click(confirm);
		await expect.poll(() => names(root)).toEqual(['Brief']);
		await expect.poll(() => document.activeElement).toBe(deleteOf(root, 0));

		await userEvent.click(deleteOf(root, 0));
		await userEvent.click(confirm);
		await expect.poll(() => names(root)).toEqual([]);
		expect(empty.hidden).toBe(false);
		await expect.poll(() => document.activeElement).toBe(reset);
		expect(status(root)).toBe('Deleted Brief, 0 left');

		await userEvent.click(reset);
		await expect.poll(() => names(root)).toEqual(['Brief', 'Report', 'Notes']);
		expect(empty.hidden).toBe(true);
		await expect.poll(() => document.activeElement).toBe(deleteOf(root, 0));
		expect(status(root)).toBe('List restored');
	});

	test('releases the scroll lock and the document listeners when the element leaves while open, and a fresh copy works', async () => {
		const tracker = trackListeners();
		try {
			const root = await ready(await mountComponent('modal'));
			const before = tracker.live(document);
			await userEvent.click(deleteOf(root, 0));
			await expect.poll(() => document.documentElement.style.overflow).toBe('hidden');
			expect(tracker.live(document).length).toBeGreaterThan(before.length);

			root.remove();
			expect(tracker.live(document)).toEqual(before);
			expect(document.documentElement.style.overflow).toBe('');
		} finally {
			tracker.stop();
		}

		const fresh = document.createElement('modal-app');
		document.body.append(fresh);
		await ready(fresh);
		await userEvent.click(deleteOf(fresh, 0));
		await expect.poll(() => layer(fresh).hidden).toBe(false);
		await userEvent.keyboard('{Escape}');
		await expect.poll(() => status(fresh)).toBe('Kept Brief');
	});
});
