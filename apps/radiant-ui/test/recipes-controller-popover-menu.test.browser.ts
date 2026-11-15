import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/popover-menu.css';
import { mountController, trackListeners } from './mount-recipe';

afterEach(() => {
	document.body.innerHTML = '';
});

const macrotask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('popover menu controller', () => {
	const ready = async (root: HTMLElement) => {
		await expect.poll(() => root.querySelector<HTMLElement>('[role="menuitem"]')!.tabIndex).toBe(0);
		return root;
	};
	const status = (root: HTMLElement) => root.querySelector('[data-status]')!.textContent;
	const parts = (root: HTMLElement) => ({
		trigger: root.querySelector<HTMLElement>('button[aria-haspopup]')!,
		menu: root.querySelector<HTMLElement>('[role="menu"]')!,
		items: [...root.querySelectorAll<HTMLElement>('[role="menuitem"]')],
	});

	test('starts closed on authored markup', async () => {
		const root = await ready(await mountController('popover-menu'));
		const { trigger, menu, items } = parts(root);

		expect(items.map((item) => item.textContent)).toEqual(['Rename', 'Duplicate', 'Delete']);
		expect(menu.hidden).toBe(true);
		expect(trigger.getAttribute('aria-expanded')).toBe('false');
		expect(status(root)).toBe('Menu closed');
	});

	test('opens into the menu, walks the items and returns focus to the button', async () => {
		const root = await ready(await mountController('popover-menu'));
		const { trigger, menu, items } = parts(root);

		await userEvent.click(trigger);
		expect(menu.hidden).toBe(false);
		expect(trigger.getAttribute('aria-expanded')).toBe('true');
		expect(document.activeElement).toBe(items[0]);
		expect(status(root)).toBe('Menu open');

		await userEvent.keyboard('{ArrowDown}');
		expect(document.activeElement).toBe(items[1]);

		await userEvent.keyboard('{Escape}');
		expect(menu.hidden).toBe(true);
		expect(document.activeElement).toBe(trigger);
		expect(trigger.getAttribute('aria-expanded')).toBe('false');

		await userEvent.click(trigger);
		await userEvent.click(document.body);
		expect(menu.hidden).toBe(true);

		await userEvent.click(trigger);
		await userEvent.keyboard('{End}{Enter}');
		expect(menu.hidden).toBe(true);
		expect(status(root)).toBe('Chose Delete');
		expect(document.activeElement).toBe(trigger);
	});

	test('the open menu stays inside the example frame, so it covers nothing after it', async () => {
		const root = await ready(await mountController('popover-menu'));
		const frame = document.createElement('div');
		frame.dataset.host = '';
		frame.className = 'primitive-example';
		root.replaceWith(frame);
		frame.append(root);
		await macrotask();
		await ready(root);

		await userEvent.click(parts(root).trigger);

		await expect
			.poll(() => parts(root).menu.getBoundingClientRect().bottom)
			.toBeLessThanOrEqual(frame.getBoundingClientRect().bottom);
	});

	test('removes every listener when the element leaves, and a fresh copy works', async () => {
		const tracker = trackListeners();
		try {
			const root = await ready(await mountController('popover-menu'));
			await userEvent.click(parts(root).trigger);
			expect(tracker.live(document, window).length).toBeGreaterThan(0);
			root.remove();
			await macrotask();
			expect(tracker.live(document, window, root, ...root.querySelectorAll('*'))).toEqual([]);
		} finally {
			tracker.stop();
		}

		const fresh = await ready(await mountController('popover-menu'));
		await userEvent.click(parts(fresh).trigger);
		expect(parts(fresh).menu.hidden).toBe(false);
		await userEvent.keyboard('{Enter}');
		expect(status(fresh)).toBe('Chose Rename');
	});
});
