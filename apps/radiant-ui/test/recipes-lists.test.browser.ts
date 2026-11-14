import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import { mountForm, mountRecipe, type Form } from './mount-recipe';

function pointer(target: Element, type: string, x: number, y: number, timeStamp?: number): void {
	const event = new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, clientX: x, clientY: y });
	if (timeStamp !== undefined) {
		Object.defineProperty(event, 'timeStamp', { value: timeStamp });
	}
	target.dispatchEvent(event);
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
		expect(ship.parentElement).toBe(document.body);
		pointer(ship, 'pointerup', start.x + 5, first.y + 1);
		expect(texts(items())).toEqual(['Ship', 'Build', 'Test', 'Plan']);
	});

	test('board moves a card between columns by pointer and by keyboard, the card leaving the clipped column', async () => {
		const root = await mountRecipe('board');
		const columns = () => [...root.querySelectorAll('ul')];
		const cards = (column: number) => texts(columns()[column].children);

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
		expect(cards(0)).toEqual([
			'Sketch the layout',
			'Pick the colors',
			'Draft the copy',
			'Review accessibility',
			'Plan the launch',
		]);
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

	describe.each<Form>(['plain', 'radiant'])('searchable list, %s form', (form) => {
		test('filters as you type and the arrows walk the matches', async () => {
			const root = await mountForm('searchable-list', form);
			const input = root.querySelector('input')!;
			const shown = () => [...root.querySelectorAll('li')].filter((li) => !li.hidden);
			await expect.poll(() => root.querySelector('li')!.tabIndex).toBe(0);

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

			await userEvent.clear(input);
			await userEvent.type(input, 'zzz');
			expect(status(root)).toBe('No matches');
		});

		test('has a visible label tied to its field', async () => {
			const root = await mountForm('searchable-list', form);

			expect(root.querySelector('label')!.htmlFor).toBe(root.querySelector('input')!.id);
		});
	});

	test('searchable list Radiant form removes every listener when the element leaves and starts again on a fresh copy', async () => {
		const add = EventTarget.prototype.addEventListener;
		const remove = EventTarget.prototype.removeEventListener;
		const live = new Set<string>();
		const ids = new WeakMap<object, number>();
		const key = (target: EventTarget, type: string, listener: unknown, options: unknown) => {
			const id = (value: unknown) => {
				if (typeof value !== 'object' && typeof value !== 'function') return String(value);
				const object = value as object;
				return String(ids.get(object) ?? ids.set(object, ids.size).get(object));
			};
			return [id(target), type, id(listener), JSON.stringify(options)].join('|');
		};
		EventTarget.prototype.addEventListener = function (type, listener, options) {
			live.add(key(this, type, listener, options));
			return add.call(this, type, listener, options);
		};
		EventTarget.prototype.removeEventListener = function (type, listener, options) {
			live.delete(key(this, type, listener, options));
			return remove.call(this, type, listener, options);
		};
		let root: HTMLElement;
		try {
			root = await mountForm('searchable-list', 'radiant');
			await expect.poll(() => root.querySelector('li')!.tabIndex).toBe(0);
			expect(live.size).toBeGreaterThan(0);
			root.remove();
			expect([...live]).toEqual([]);
		} finally {
			EventTarget.prototype.addEventListener = add;
			EventTarget.prototype.removeEventListener = remove;
		}

		const fresh = root.cloneNode(true) as HTMLElement;
		document.body.append(fresh);
		await expect.poll(() => fresh.querySelector('li')!.tabIndex).toBe(0);
		await userEvent.type(fresh.querySelector('input')!, 'ch');
		expect(texts([...fresh.querySelectorAll('li')].filter((li) => !li.hidden))).toEqual(['Cherry']);
		expect(status(fresh)).toBe('1 of 5 shown');
	});
});
