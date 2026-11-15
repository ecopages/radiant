import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import { stopControllers } from '@ecopages/radiant/controller-registry';
import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/calendar-events.css';
import { mountController, trackListeners } from './mount-recipe';

const texts = (nodes: Iterable<Element>) => [...nodes].map((node) => node.textContent);
const status = (root: HTMLElement) => root.querySelector('[data-status]')!.textContent;
const day = (root: HTMLElement, iso: string) => root.querySelector<HTMLElement>(`[data-iso="${iso}"]`)!;
const titles = (root: HTMLElement, iso: string) => texts(day(root, iso).querySelectorAll('[data-event]'));
const ready = async (root: HTMLElement) => {
	await expect.poll(() => root.querySelectorAll('[role="gridcell"]').length).toBeGreaterThan(0);
	return root;
};

afterEach(() => {
	stopControllers();
	document.body.innerHTML = '';
});

describe('calendar of events, controller form', () => {
	test('draws the month and the events into the authored markup', async () => {
		const root = await ready(await mountController('calendar-events'));

		expect(root.tagName).toBe('DIV');
		expect(root.querySelector('[data-title]')!.textContent).toBe('November 2026');
		expect(titles(root, '2026-11-03')).toEqual(['Design review', 'Standup']);
		expect(root.querySelectorAll('[role="gridcell"][tabindex="0"]')).toHaveLength(1);
	});

	test('a pointer drag moves an event to another day', async () => {
		const root = await ready(await mountController('calendar-events'));

		await userEvent.dragAndDrop(day(root, '2026-11-12').querySelector('[data-event]')!, day(root, '2026-11-13'));

		expect(titles(root, '2026-11-12')).toEqual([]);
		expect(titles(root, '2026-11-13')).toEqual(['Launch day']);
	});

	test('the keyboard walks the days, lifts an event, moves it to the next day and announces it', async () => {
		const root = await ready(await mountController('calendar-events'));
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
		const root = await ready(await mountController('calendar-events'));

		await userEvent.fill(root.querySelector('input')!, 'stand');

		expect(titles(root, '2026-11-03')).toEqual(['Standup']);
		expect(root.querySelectorAll('[data-event]')).toHaveLength(1);
	});

	test('removing the element leaves no listener behind, and a fresh copy starts again', async () => {
		const tracker = trackListeners();
		let root!: HTMLElement;
		try {
			root = await ready(await mountController('calendar-events'));
			await userEvent.fill(root.querySelector('input')!, 'stand');
			expect(tracker.live().length).toBeGreaterThan(0);

			root.remove();
			await new Promise((resolve) => setTimeout(resolve));

			expect(tracker.live(document, window)).toEqual([]);
			expect(tracker.live()).toEqual([]);
		} finally {
			tracker.stop();
		}

		const fresh = root.cloneNode(true) as HTMLElement;
		document.body.append(fresh);
		await ready(fresh);
		await userEvent.fill(fresh.querySelector('input')!, 'stand');
		expect(fresh.querySelectorAll('[data-event]')).toHaveLength(1);
	});
});
