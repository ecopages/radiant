import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/popover-menu.css';
import { mountComponent, trackListeners } from './mount-recipe';

afterEach(() => {
	document.body.innerHTML = '';
});

describe('popover menu component', () => {
	const ready = async (root: HTMLElement) => {
		await expect.poll(() => root.querySelectorAll('[role="menuitem"]')).toHaveLength(3);
		await expect.poll(() => root.querySelector<HTMLElement>('[role="menuitem"]')!.tabIndex).toBe(0);
		return root;
	};
	const status = (root: HTMLElement) => root.querySelector('[data-status]')!.textContent;
	const parts = (root: HTMLElement) => ({
		trigger: root.querySelector<HTMLElement>('button[aria-haspopup]')!,
		menu: root.querySelector<HTMLElement>('[role="menu"]')!,
		items: [...root.querySelectorAll<HTMLElement>('[role="menuitem"]')],
	});

	test('draws a closed menu with its three actions from its state', async () => {
		const root = await ready(await mountComponent('popover-menu'));
		const { trigger, menu, items } = parts(root);

		expect(items.map((item) => item.textContent)).toEqual(['Rename', 'Duplicate', 'Delete']);
		expect(menu.hidden).toBe(true);
		expect(trigger.getAttribute('aria-expanded')).toBe('false');
		expect(status(root)).toBe('Menu closed');
	});

	test('opens into the menu, walks the items and returns focus to the button', async () => {
		const root = await ready(await mountComponent('popover-menu'));
		const { trigger, menu, items } = parts(root);

		await userEvent.click(trigger);
		expect(menu.hidden).toBe(false);
		await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('true');
		expect(document.activeElement).toBe(items[0]);
		expect(status(root)).toBe('Menu open');

		await userEvent.keyboard('{ArrowDown}');
		expect(document.activeElement).toBe(items[1]);

		await userEvent.keyboard('{Escape}');
		expect(menu.hidden).toBe(true);
		expect(document.activeElement).toBe(trigger);
		await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('false');

		await userEvent.click(trigger);
		await userEvent.click(document.body);
		expect(menu.hidden).toBe(true);

		await userEvent.click(trigger);
		await userEvent.keyboard('{End}{Enter}');
		expect(menu.hidden).toBe(true);
		await expect.poll(() => status(root)).toBe('Chose Delete');
		expect(document.activeElement).toBe(trigger);
	});

	test('the open menu stays inside the example frame, so it covers nothing after it', async () => {
		const root = await ready(await mountComponent('popover-menu'));
		const frame = document.createElement('div');
		frame.dataset.host = '';
		frame.className = 'primitive-example';
		root.replaceWith(frame);
		frame.append(root);
		await ready(root);

		await userEvent.click(parts(root).trigger);

		await expect
			.poll(() => parts(root).menu.getBoundingClientRect().bottom)
			.toBeLessThanOrEqual(frame.getBoundingClientRect().bottom);
	});

	test('removes every listener when the element leaves, and a fresh copy works', async () => {
		const tracker = trackListeners();
		let root!: HTMLElement;
		try {
			root = await ready(await mountComponent('popover-menu'));
			await userEvent.click(parts(root).trigger);
			expect(tracker.live().length).toBeGreaterThan(0);
			root.remove();
			expect(tracker.live()).toEqual([]);
		} finally {
			tracker.stop();
		}

		const fresh = document.createElement('popover-menu-app');
		document.body.append(fresh);
		await ready(fresh);
		await userEvent.click(parts(fresh).trigger);
		expect(parts(fresh).menu.hidden).toBe(false);
		await userEvent.keyboard('{Enter}');
		await expect.poll(() => status(fresh)).toBe('Chose Rename');
	});
});
