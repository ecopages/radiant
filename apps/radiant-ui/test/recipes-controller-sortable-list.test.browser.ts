import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/sortable-list.css';
import { mountController, trackListeners } from './mount-recipe';

const texts = (nodes: Iterable<Element>) => [...nodes].map((node) => node.textContent?.trim());
const status = (root: HTMLElement) => root.querySelector('[data-status]')!.textContent;
const macrotask = () => new Promise((resolve) => setTimeout(resolve));

afterEach(() => {
	document.body.innerHTML = '';
});

describe('sortable list, Radiant controller form', () => {
	const items = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('li')];

	test('reorders by keyboard with one tab stop, announces it and focus follows', async () => {
		const root = await mountController('sortable-list');
		await expect.poll(() => items(root).map((li) => li.tabIndex)).toEqual([0, -1, -1, -1]);

		items(root)[0].focus();
		await userEvent.keyboard(' {ArrowDown}{ArrowDown} ');

		expect(texts(items(root))).toEqual(['Build', 'Test', 'Plan', 'Ship']);
		expect(document.activeElement).toBe(items(root)[2]);
		expect(status(root)).toBe('Dropped Plan, position 3 of 4.');

		await userEvent.keyboard('{ArrowUp}');

		expect(document.activeElement).toBe(items(root)[1]);
	});

	test('a pointer drag moves an item, with the lifted item above the page', async () => {
		const root = await mountController('sortable-list');
		await expect.poll(() => items(root).map((li) => li.tabIndex)).toEqual([0, -1, -1, -1]);
		const ship = items(root)[3];
		const first = items(root)[0].getBoundingClientRect();
		const start = ship.getBoundingClientRect();
		const point = (target: Element, type: string, y: number) =>
			target.dispatchEvent(
				new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, clientX: start.x + 5, clientY: y }),
			);

		point(ship, 'pointerdown', start.y + 5);
		point(ship, 'pointermove', first.y + 1);
		expect(ship.parentElement).toBe(document.body);
		point(ship, 'pointerup', first.y + 1);

		expect(texts(items(root))).toEqual(['Ship', 'Plan', 'Build', 'Test']);
		expect(document.querySelector('[data-sortable-placeholder]')).toBeNull();
	});

	test('a mouse drag moves an item below the one it is released over', async () => {
		const root = await mountController('sortable-list');
		await expect.poll(() => items(root)).toHaveLength(4);

		await userEvent.dragAndDrop(items(root)[0], items(root)[3]);

		expect(texts(items(root)).indexOf('Plan')).toBeGreaterThan(0);
		expect(document.querySelector('[data-sortable-placeholder]')).toBeNull();
	});

	test('removes every listener and the lifted item when the element is removed', async () => {
		const tracker = trackListeners();
		try {
			const root = await mountController('sortable-list');
			await expect.poll(() => items(root).map((li) => li.tabIndex)).toEqual([0, -1, -1, -1]);
			const from = items(root)[0].getBoundingClientRect();
			items(root)[0].dispatchEvent(
				new PointerEvent('pointerdown', {
					bubbles: true,
					button: 0,
					pointerId: 1,
					clientX: from.x + 5,
					clientY: from.y + 5,
				}),
			);
			document.dispatchEvent(
				new PointerEvent('pointermove', {
					bubbles: true,
					pointerId: 1,
					clientX: from.x + 40,
					clientY: from.y + 30,
				}),
			);
			expect(document.querySelector('[data-sortable-state="lifted"]')).not.toBeNull();
			expect(tracker.live(document, window).length).toBeGreaterThan(0);

			root.remove();
			await macrotask();

			expect(tracker.live()).toEqual([]);
			expect(document.querySelector('[data-sortable-state="lifted"]')).toBeNull();
			expect(document.querySelector('[data-sortable-placeholder]')).toBeNull();
		} finally {
			tracker.stop();
		}
	});
});
