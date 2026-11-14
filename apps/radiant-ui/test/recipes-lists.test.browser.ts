import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';

const pages = import.meta.glob('../src/content/components/recipes/*.mdx', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>;
const scripts = import.meta.glob('../src/content/components/recipes/*.script.ts');

/** Mounts the markup a recipe page documents and runs the script it documents. */
async function mountRecipe(slug: string): Promise<HTMLElement> {
	const page = pages[`../src/content/components/recipes/${slug}.mdx`]!;
	document.body.innerHTML = page.match(/```html\n([\s\S]*?)\n```/)![1];
	await scripts[`../src/content/components/recipes/${slug}.script.ts`]!();
	return document.querySelector<HTMLElement>(`[data-example="${slug}"]`)!;
}

function pointer(target: Element, type: string, x: number, y: number): void {
	target.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, clientX: x, clientY: y }));
}

const status = (root: HTMLElement) => root.querySelector('[data-status]')!.textContent;
const texts = (nodes: Iterable<Element>) => [...nodes].map((node) => node.textContent);

afterEach(() => {
	document.body.innerHTML = '';
	document.documentElement.removeAttribute('style');
});

describe('recipes', () => {
	test('sortable list reorders by keyboard and by pointer, with one tab stop', async () => {
		const root = await mountRecipe('sortable-list');
		const items = () => [...root.querySelectorAll('li')];
		expect(items().map((li) => li.tabIndex)).toEqual([0, -1, -1, -1]);

		items()[0].focus();
		await userEvent.keyboard(' {ArrowDown}{ArrowDown} ');
		expect(texts(items())).toEqual(['Build', 'Test', 'Plan', 'Ship']);
		expect(document.activeElement).toBe(items()[2]);
		expect(status(root)).toBe('Dropped Plan, position 3 of 4.');

		await userEvent.keyboard('{ArrowUp}');
		expect(document.activeElement).toBe(items()[1]);

		const ship = items()[3];
		const first = items()[0].getBoundingClientRect();
		const start = ship.getBoundingClientRect();
		pointer(ship, 'pointerdown', start.x + 5, start.y + 5);
		pointer(ship, 'pointermove', start.x + 5, first.y + 1);
		pointer(ship, 'pointerup', start.x + 5, first.y + 1);
		expect(texts(items())).toEqual(['Ship', 'Build', 'Test', 'Plan']);
	});

	test('searchable list filters as you type and the arrows walk the matches', async () => {
		const root = await mountRecipe('searchable-list');
		const input = root.querySelector('input')!;
		const shown = () => [...root.querySelectorAll('li')].filter((li) => !li.hidden);

		await userEvent.type(input, 'ap');
		expect(texts(shown())).toEqual(['Apple', 'Apricot']);
		expect(status(root)).toBe('2 of 5 shown');

		await userEvent.keyboard('{ArrowDown}');
		expect(document.activeElement).toBe(shown()[0]);
		await userEvent.keyboard('{ArrowDown}');
		expect(document.activeElement).toBe(shown()[1]);
		await userEvent.keyboard('{Enter}');
		expect(status(root)).toBe('Chose Apricot');

		await userEvent.clear(input);
		await userEvent.type(input, 'ban');
		await userEvent.tab();
		expect(document.activeElement).toBe(shown()[0]);
		expect(texts(shown())).toEqual(['Banana']);
	});

	test('swipe card is dismissed by a swipe or the button, not by a press on the button', async () => {
		const root = await mountRecipe('swipe-card');
		const card = root.querySelector<HTMLElement>('[data-card]')!;
		const dismiss = root.querySelector<HTMLElement>('[data-dismiss]')!;
		const restore = root.querySelector<HTMLButtonElement>('[data-restore]')!;

		pointer(dismiss, 'pointerdown', 10, 0);
		pointer(dismiss, 'pointerup', 200, 0);
		expect(card.hidden).toBe(false);

		pointer(card, 'pointerdown', 200, 0);
		pointer(card, 'pointerup', 20, 0);
		expect(card.hidden).toBe(true);
		expect(status(root)).toBe('Card dismissed, swiped left');

		restore.click();
		expect(card.hidden).toBe(false);

		await userEvent.click(dismiss);
		expect(card.hidden).toBe(true);
		expect(status(root)).toBe('Card dismissed');
		expect(document.activeElement).toBe(restore);
	});

	test('popover menu opens into the menu, walks the items and returns focus to the button', async () => {
		const root = await mountRecipe('popover-menu');
		const trigger = root.querySelector<HTMLElement>('button')!;
		const menu = root.querySelector<HTMLElement>('[role="menu"]')!;
		const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')];
		expect(menu.hidden).toBe(true);

		await userEvent.click(trigger);
		expect(menu.hidden).toBe(false);
		expect(trigger.getAttribute('aria-expanded')).toBe('true');
		expect(document.activeElement).toBe(items[0]);

		await userEvent.keyboard('{ArrowDown}');
		expect(document.activeElement).toBe(items[1]);

		await userEvent.keyboard('{Escape}');
		expect(menu.hidden).toBe(true);
		expect(document.activeElement).toBe(trigger);

		await userEvent.click(trigger);
		await userEvent.click(document.body);
		expect(menu.hidden).toBe(true);

		await userEvent.click(trigger);
		await userEvent.keyboard('{End}{Enter}');
		expect(menu.hidden).toBe(true);
		expect(status(root)).toBe('Chose Delete');
		expect(document.activeElement).toBe(trigger);
	});

	test('modal traps focus, locks scroll, closes three ways and returns focus to the opener', async () => {
		const root = await mountRecipe('modal');
		const opener = root.querySelector<HTMLElement>('[data-open]')!;
		const dialog = root.querySelector<HTMLElement>('[data-dialog]')!;
		const origin = dialog.parentElement!;
		const [confirm, cancel] = dialog.querySelectorAll<HTMLElement>('button');

		await userEvent.click(opener);
		expect(dialog.hidden).toBe(false);
		expect(dialog.parentElement).toBe(root);
		expect(document.documentElement.style.overflow).toBe('hidden');
		await expect.poll(() => document.activeElement).toBe(confirm);

		await userEvent.tab();
		expect(document.activeElement).toBe(cancel);
		await userEvent.tab();
		expect(document.activeElement).toBe(confirm);

		await userEvent.keyboard('{Escape}');
		expect(dialog.hidden).toBe(true);
		expect(dialog.parentElement).toBe(origin);
		expect(document.documentElement.style.overflow).toBe('');
		expect(document.activeElement).toBe(opener);

		await userEvent.click(opener);
		await userEvent.click(cancel);
		expect(dialog.hidden).toBe(true);
		expect(document.activeElement).toBe(opener);

		await userEvent.click(opener);
		pointer(document.body, 'pointerdown', 0, 0);
		expect(dialog.hidden).toBe(true);
	});
});
