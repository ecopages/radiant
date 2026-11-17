import { userEvent } from 'vitest/browser';
import { afterEach, expect, test } from 'vitest';
import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/board.css';
import { mountController, trackListeners } from './mount-recipe';
import { until } from './until';

function pointer(target: Element | Document, type: string, x: number, y: number): void {
	target.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, clientX: x, clientY: y }));
}

const texts = (nodes: Iterable<Element>) => [...nodes].map((node) => node.textContent);
const status = (root: HTMLElement) => root.querySelector('[data-status]')!.textContent;

afterEach(() => {
	document.body.innerHTML = '';
});

test('board controller moves a card between columns by pointer and by keyboard, the card leaving the clipped column', async () => {
	const root = await mountController('board');
	const columns = () => [...root.querySelectorAll('ul')];
	const cards = (column: number) => texts(columns()[column].children);
	await until(() => expect((columns()[0].children[0] as HTMLElement).tabIndex).toBe(0));

	const card = columns()[0].children[0] as HTMLElement;
	const from = card.getBoundingClientRect();
	const target = columns()[1].children[1].getBoundingClientRect();
	const x = target.x + 5;
	pointer(card, 'pointerdown', from.x + 5, from.y + 5);
	pointer(document, 'pointermove', x, target.y + 2);
	expect(card.parentElement).toBe(document.body);
	expect(columns()[1].querySelector('[data-sortable-placeholder]')).toBe(columns()[1].children[1]);
	pointer(document, 'pointerup', x, target.y + 2);
	expect(card.parentElement).toBe(columns()[1]);
	expect(cards(1)).toEqual(['Build the header', 'Write the brief', 'Wire the form']);
	expect(document.activeElement).toBe(card);
	expect(status(root)).toBe('Dropped Write the brief in Doing, position 2 of 3.');

	const wire = columns()[1].children[2] as HTMLElement;
	wire.focus();
	await userEvent.keyboard(' {PageDown}');
	expect(wire.parentElement).toBe(document.body);
	expect(columns()[2].querySelector('[data-sortable-placeholder]')).toBe(columns()[2].children[1]);
	await userEvent.keyboard('{ArrowUp} ');
	expect(cards(1)).toEqual(['Build the header', 'Write the brief']);
	expect(cards(2)).toEqual(['Wire the form', 'Set up the repo']);
	expect(document.activeElement).toBe(wire);
	expect(document.querySelector('[data-sortable-placeholder]')).toBeNull();
});

test('board controller moves a card into another column with a mouse drag', async () => {
	const root = await mountController('board');
	const columns = () => [...root.querySelectorAll('ul')];
	await until(() => expect((columns()[0].children[0] as HTMLElement).tabIndex).toBe(0));

	await userEvent.dragAndDrop(columns()[0].children[0] as HTMLElement, columns()[2].children[0] as HTMLElement);

	expect(texts(columns()[0].children)).not.toContain('Write the brief');
	expect(texts(columns()[2].children)).toContain('Write the brief');
});

test('board controller removes every listener and a lifted card when its element is removed', async () => {
	const tracker = trackListeners();
	try {
		const root = await mountController('board');
		const card = root.querySelector<HTMLElement>('li')!;
		await until(() => expect(card.tabIndex).toBe(0));
		const from = card.getBoundingClientRect();
		pointer(card, 'pointerdown', from.x + 5, from.y + 5);
		pointer(document, 'pointermove', from.x + 40, from.y + 30);
		expect(card.parentElement).toBe(document.body);

		root.remove();
		await new Promise((resolve) => setTimeout(resolve));

		expect(tracker.live(document, window)).toEqual([]);
		expect(document.querySelector('[data-sortable-state="lifted"]')).toBeNull();
		expect(document.querySelector('[data-sortable-placeholder]')).toBeNull();
	} finally {
		tracker.stop();
	}
});
