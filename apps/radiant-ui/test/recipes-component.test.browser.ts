import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/board.css';
import '../src/content/components/recipes/calendar-events.css';
import { mountComponent, trackListeners } from './mount-recipe';

const texts = (nodes: Iterable<Element>) => [...nodes].map((node) => node.textContent?.trim());

afterEach(() => {
	document.body.innerHTML = '';
});

describe('board component', () => {
	const columns = (root: HTMLElement) => [...root.querySelectorAll('ul')];
	const cards = (root: HTMLElement, column: number) => texts(columns(root)[column].children);
	const ready = async (root: HTMLElement) => {
		await expect.poll(() => columns(root)).toHaveLength(3);
		await expect.poll(() => root.querySelector<HTMLElement>('[data-card]')!.isConnected).toBe(true);
		return root;
	};

	test('draws the default columns from its state', async () => {
		const root = await ready(await mountComponent('board'));

		expect(texts(root.querySelectorAll('h3'))).toEqual(['To do', 'Doing', 'Done']);
		expect(cards(root, 0)).toHaveLength(6);
		expect(cards(root, 1)).toEqual(['Build the header', 'Wire the form']);
		expect(cards(root, 2)).toEqual(['Set up the repo']);
	});

	test('a pointer drag moves a card, and the render shows it and keeps it after the next move', async () => {
		const root = await ready(await mountComponent('board'));

		await userEvent.dragAndDrop(
			columns(root)[0].children[0] as HTMLElement,
			columns(root)[2].children[0] as HTMLElement,
		);

		expect(cards(root, 0)).not.toContain('Write the brief');
		expect(cards(root, 2)).toContain('Write the brief');
		expect(document.querySelector('[data-sortable-placeholder]')).toBeNull();

		await userEvent.dragAndDrop(
			columns(root)[1].children[0] as HTMLElement,
			columns(root)[0].children[0] as HTMLElement,
		);

		expect(cards(root, 1)).toEqual(['Wire the form']);
		expect(cards(root, 0)).toContain('Build the header');
		expect(cards(root, 2)).toContain('Write the brief');
	});

	test('the keyboard moves a card to the next column, then another, and focus follows the card', async () => {
		const root = await ready(await mountComponent('board'));
		const wire = () => root.querySelector<HTMLElement>('[data-card="form"]')!;
		wire().focus();

		await userEvent.keyboard(' {PageDown}{ArrowUp} ');

		expect(cards(root, 1)).toEqual(['Build the header']);
		expect(cards(root, 2)).toEqual(['Wire the form', 'Set up the repo']);
		expect(document.activeElement).toBe(wire());
		expect(root.querySelector('[data-status]')!.textContent).toBe(
			'Dropped Wire the form in Done, position 1 of 2.',
		);

		await userEvent.keyboard(' {ArrowDown} ');

		expect(cards(root, 2)).toEqual(['Set up the repo', 'Wire the form']);
		expect(document.activeElement).toBe(wire());
	});

	test('removes every listener when the element leaves, and a fresh copy works', async () => {
		const tracker = trackListeners();
		let root!: HTMLElement;
		try {
			root = await ready(await mountComponent('board'));
			expect(tracker.live().length).toBeGreaterThan(0);
			root.remove();
			expect(tracker.live()).toEqual([]);
		} finally {
			tracker.stop();
		}

		const fresh = document.createElement('recipe-board-app');
		document.body.append(fresh);
		await ready(fresh);
		(fresh.querySelector('[data-card="brief"]') as HTMLElement).focus();
		await userEvent.keyboard(' {PageDown} ');

		expect(cards(fresh, 1)).toContain('Write the brief');
	});
});

describe('calendar events component', () => {
	const day = (root: HTMLElement, iso: string) => root.querySelector<HTMLElement>(`[data-iso="${iso}"]`)!;
	const titles = (root: HTMLElement, iso: string) => texts(day(root, iso).querySelectorAll('[data-event]'));
	const ready = async (root: HTMLElement) => {
		await expect.poll(() => root.querySelectorAll('[role="gridcell"]').length).toBeGreaterThan(0);
		return root;
	};

	test('draws the month and the default events from its state', async () => {
		const root = await ready(await mountComponent('calendar-events'));

		expect(root.querySelector('[data-title]')!.textContent).toBe('November 2026');
		expect(texts(root.querySelectorAll('[role="columnheader"]'))).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
		expect(root.querySelectorAll('[role="gridcell"]')).toHaveLength(42);
		expect(titles(root, '2026-11-03')).toEqual(['Design review', 'Standup']);
		expect(titles(root, '2026-11-12')).toEqual(['Launch day']);
	});

	test('a pointer drag moves an event to another day, and a second move works after the render', async () => {
		const root = await ready(await mountComponent('calendar-events'));

		await userEvent.dragAndDrop(day(root, '2026-11-12').querySelector('[data-event]')!, day(root, '2026-11-13'));

		expect(titles(root, '2026-11-12')).toEqual([]);
		expect(titles(root, '2026-11-13')).toEqual(['Launch day']);

		await userEvent.dragAndDrop(day(root, '2026-11-19').querySelector('[data-event]')!, day(root, '2026-11-20'));

		expect(titles(root, '2026-11-20')).toEqual(['Retro']);
		expect(titles(root, '2026-11-13')).toEqual(['Launch day']);
	});

	test('keeps one tab stop on the days and moves it to the day of the event that takes focus', async () => {
		const root = await ready(await mountComponent('calendar-events'));
		const stops = () =>
			[...root.querySelectorAll<HTMLElement>('[role="gridcell"]')].filter((cell) => cell.tabIndex === 0);
		await expect.poll(() => stops()).toHaveLength(1);

		day(root, '2026-11-12').querySelector<HTMLElement>('[data-event]')!.focus();

		expect(stops()).toEqual([day(root, '2026-11-12')]);
	});

	test('the keyboard walks the days, lifts an event, moves it twice and announces it', async () => {
		const root = await ready(await mountComponent('calendar-events'));
		day(root, '2026-11-01').focus();

		await userEvent.keyboard('{ArrowRight}{ArrowDown}{ArrowUp}{ArrowRight}');
		expect(document.activeElement).toBe(day(root, '2026-11-03'));

		await userEvent.keyboard('{Enter} {PageDown} ');

		expect(titles(root, '2026-11-03')).toEqual(['Standup']);
		expect(titles(root, '2026-11-04')).toEqual(['Design review']);
		expect(document.activeElement).toBe(day(root, '2026-11-04').querySelector('[data-event]'));
		expect(root.querySelector('[data-status]')!.textContent).toContain('Dropped Design review');

		await userEvent.keyboard(' {PageDown} ');

		expect(titles(root, '2026-11-04')).toEqual([]);
		expect(titles(root, '2026-11-05')).toEqual(['Design review']);
		expect(document.activeElement).toBe(day(root, '2026-11-05').querySelector('[data-event]'));
	});

	test('the filter leaves out the events that do not match, and clearing it brings them back', async () => {
		const root = await ready(await mountComponent('calendar-events'));

		await userEvent.fill(root.querySelector('input')!, 'stand');

		expect(titles(root, '2026-11-03')).toEqual(['Standup']);
		expect(root.querySelectorAll('[data-event]')).toHaveLength(1);

		await userEvent.fill(root.querySelector('input')!, '');

		expect(root.querySelectorAll('[data-event]')).toHaveLength(4);
	});

	test('removes every listener when the element leaves, and a fresh copy works', async () => {
		const tracker = trackListeners();
		let root!: HTMLElement;
		try {
			root = await ready(await mountComponent('calendar-events'));
			expect(tracker.live().length).toBeGreaterThan(0);
			root.remove();
			expect(tracker.live()).toEqual([]);
		} finally {
			tracker.stop();
		}

		const fresh = document.createElement('recipe-calendar-events-app');
		document.body.append(fresh);
		await ready(fresh);
		await userEvent.fill(fresh.querySelector('input')!, 'stand');

		expect(fresh.querySelectorAll('[data-event]')).toHaveLength(1);
	});
});
