import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import '../src/content/components/recipes/board.css';
import '../src/content/components/recipes/calendar-events.css';
import '../src/content/components/recipes/sortable-list.css';
import { mountForm, type Form } from './mount-recipe';

function pointer(target: Element | Document, type: string, x: number, y: number): void {
	target.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, clientX: x, clientY: y }));
}

const status = (root: HTMLElement) => root.querySelector('[data-status]')!.textContent;
const texts = (nodes: Iterable<Element>) => [...nodes].map((node) => node.textContent);

/**
 * Records the listeners that are added and not removed while `run` works, so a test can say none is left once the
 * element has gone.
 */
async function trackListeners(run: (live: Set<string>) => Promise<void>): Promise<void> {
	const add = EventTarget.prototype.addEventListener;
	const remove = EventTarget.prototype.removeEventListener;
	const live = new Set<string>();
	const ids = new WeakMap<object, number>();
	const id = (value: unknown) => {
		if (typeof value !== 'object' && typeof value !== 'function') return String(value);
		const object = value as object;
		return String(ids.get(object) ?? ids.set(object, ids.size).get(object));
	};
	const key = (target: EventTarget, type: string, listener: unknown, options: unknown) =>
		[id(target), type, id(listener), JSON.stringify(options)].join('|');
	EventTarget.prototype.addEventListener = function (type, listener, options) {
		live.add(key(this, type, listener, options));
		return add.call(this, type, listener, options);
	};
	EventTarget.prototype.removeEventListener = function (type, listener, options) {
		live.delete(key(this, type, listener, options));
		return remove.call(this, type, listener, options);
	};
	try {
		await run(live);
	} finally {
		EventTarget.prototype.addEventListener = add;
		EventTarget.prototype.removeEventListener = remove;
	}
}

afterEach(() => {
	document.body.innerHTML = '';
	document.documentElement.removeAttribute('style');
});

describe.each<Form>(['plain', 'radiant'])('sortable list, %s form', (form) => {
	test('reorders by keyboard and by pointer, with one tab stop', async () => {
		const root = await mountForm('sortable-list', form);
		const items = () => [...root.querySelectorAll('li')];
		await expect.poll(() => items().map((li) => li.tabIndex)).toEqual([0, -1, -1, -1]);

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
});

describe.each<Form>(['plain', 'radiant'])('board, %s form', (form) => {
	test('moves a card between columns by pointer and by keyboard, the card leaving the clipped column', async () => {
		const root = await mountForm('board', form);
		const columns = () => [...root.querySelectorAll('ul')];
		const cards = (column: number) => texts(columns()[column].children);
		await expect.poll(() => columns()).toHaveLength(3);

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
});

describe.each<Form>(['plain', 'radiant'])('calendar of events, %s form', (form) => {
	const day = (root: HTMLElement, iso: string) => root.querySelector<HTMLElement>(`[data-iso="${iso}"]`)!;
	const titles = (root: HTMLElement, iso: string) => texts(day(root, iso).querySelectorAll('[data-event]'));
	const ready = async (root: HTMLElement) => {
		await expect.poll(() => root.querySelectorAll('[role="gridcell"]').length).toBeGreaterThan(0);
		return root;
	};

	test('a pointer drag moves an event to another day', async () => {
		const root = await ready(await mountForm('calendar-events', form));

		await userEvent.dragAndDrop(day(root, '2026-11-12').querySelector('[data-event]')!, day(root, '2026-11-13'));

		expect(titles(root, '2026-11-12')).toEqual([]);
		expect(titles(root, '2026-11-13')).toEqual(['Launch day']);
	});

	test('the keyboard walks the days, lifts an event, moves it to the next day and announces it', async () => {
		const root = await ready(await mountForm('calendar-events', form));
		day(root, '2026-11-01').focus();

		await userEvent.keyboard('{ArrowRight}{ArrowDown}{ArrowUp}{ArrowRight}');
		expect(document.activeElement).toBe(day(root, '2026-11-03'));

		await userEvent.keyboard('{Enter} {PageDown} ');

		expect(titles(root, '2026-11-03')).toEqual(['Standup']);
		expect(titles(root, '2026-11-04')).toEqual(['Design review']);
		expect(document.activeElement).toBe(day(root, '2026-11-04').querySelector('[data-event]'));
		expect(status(root)).toContain('Dropped Design review');
	});

	test('the filter leaves out the events that do not match', async () => {
		const root = await ready(await mountForm('calendar-events', form));

		await userEvent.fill(root.querySelector('input')!, 'stand');

		expect(titles(root, '2026-11-03')).toEqual(['Standup']);
		expect(root.querySelectorAll('[data-event]')).toHaveLength(1);
	});
});

describe('Radiant form teardown', () => {
	const cases = [
		{
			slug: 'sortable-list',
			ready: (root: HTMLElement) => expect.poll(() => root.querySelector('li')!.tabIndex).toBe(0),
			act: async (root: HTMLElement) => {
				root.querySelector('li')!.focus();
				await userEvent.keyboard(' {ArrowDown} ');
				expect(texts(root.querySelectorAll('li'))).toEqual(['Build', 'Plan', 'Test', 'Ship']);
			},
		},
		{
			slug: 'board',
			ready: (root: HTMLElement) => expect.poll(() => root.querySelectorAll('ul').length).toBe(3),
			act: async (root: HTMLElement) => {
				root.querySelector<HTMLElement>('li')!.focus();
				await userEvent.keyboard(' {PageDown} ');
				expect(texts(root.querySelectorAll('ul')[1].children)).toContain('Write the brief');
			},
		},
		{
			slug: 'calendar-events',
			ready: (root: HTMLElement) =>
				expect.poll(() => root.querySelectorAll('[role="gridcell"]').length).toBeGreaterThan(0),
			act: async (root: HTMLElement) => {
				await userEvent.fill(root.querySelector('input')!, 'stand');
				expect(root.querySelectorAll('[data-event]')).toHaveLength(1);
			},
		},
	];

	test.each(cases)(
		'$slug removes every listener when the element leaves and starts again on a fresh copy',
		async ({ slug, ready, act }) => {
			let root!: HTMLElement;
			await trackListeners(async (live) => {
				root = await mountForm(slug, 'radiant');
				await ready(root);
				expect(live.size).toBeGreaterThan(0);
				root.remove();
				expect([...live]).toEqual([]);
			});

			const fresh = root.cloneNode(true) as HTMLElement;
			document.body.append(fresh);
			await ready(fresh);
			await act(fresh);
		},
	);
});
