import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/sortable-list.css';
import { mountComponent, trackListeners } from './mount-recipe';
import { until } from './until';

const texts = (nodes: Iterable<Element>) => [...nodes].map((node) => node.textContent?.trim());

afterEach(() => {
	document.body.innerHTML = '';
});

describe('sortable list component', () => {
	const items = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('li')];
	const ready = async (root: HTMLElement) => {
		await until(() => expect(items(root)).toHaveLength(4));
		await until(() => expect(items(root).map((li) => li.tabIndex)).toEqual([0, -1, -1, -1]));
		return root;
	};

	test('draws the tasks from its state, with one tab stop', async () => {
		const root = await ready(await mountComponent('sortable-list'));

		expect(texts(items(root))).toEqual(['Plan', 'Build', 'Test', 'Ship']);
		expect(root.querySelector('[data-status]')!.textContent).toBe(
			'Focus an item, press Space, move with the arrows, press Space to drop',
		);
	});

	test('the keyboard lifts an item, moves it, announces it and focus follows it', async () => {
		const root = await ready(await mountComponent('sortable-list'));
		const plan = () => root.querySelector<HTMLElement>('[data-sortable-task="Plan"]')!;
		plan().focus();

		await userEvent.keyboard(' {ArrowDown}{ArrowDown} ');

		expect(texts(items(root))).toEqual(['Build', 'Test', 'Plan', 'Ship']);
		expect(document.activeElement).toBe(plan());
		expect(root.querySelector('[data-status]')!.textContent).toBe('Dropped Plan, position 3 of 4.');
		expect(items(root).map((li) => li.tabIndex)).toEqual([-1, -1, 0, -1]);

		await userEvent.keyboard('{ArrowUp}');

		expect(document.activeElement).toBe(items(root)[1]);
	});

	test('a pointer drag moves an item, and a second move works after the render', async () => {
		const root = await ready(await mountComponent('sortable-list'));

		await userEvent.dragAndDrop(items(root)[0], items(root)[3]);

		expect(texts(items(root)).indexOf('Plan')).toBeGreaterThan(0);
		expect(document.querySelector('[data-sortable-placeholder]')).toBeNull();

		const last = texts(items(root))[3];
		await userEvent.dragAndDrop(items(root)[3], items(root)[0]);

		expect(texts(items(root))[1]).toBe(last);
	});

	test('removes every listener when the element leaves, and a fresh copy works', async () => {
		const tracker = trackListeners();
		let root!: HTMLElement;
		try {
			root = await ready(await mountComponent('sortable-list'));
			expect(tracker.live().length).toBeGreaterThan(0);
			root.remove();
			expect(tracker.live()).toEqual([]);
		} finally {
			tracker.stop();
		}

		const fresh = document.createElement('sortable-list-app');
		document.body.append(fresh);
		await ready(fresh);
		fresh.querySelector<HTMLElement>('[data-sortable-task="Plan"]')!.focus();
		await userEvent.keyboard(' {ArrowDown} ');

		expect(texts(items(fresh))).toEqual(['Build', 'Plan', 'Test', 'Ship']);
	});
});
