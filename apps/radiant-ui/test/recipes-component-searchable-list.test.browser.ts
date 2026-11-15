import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';
import { mountComponent, trackListeners } from './mount-recipe';

const texts = (nodes: Iterable<Element>) => [...nodes].map((node) => node.textContent);
const status = (root: HTMLElement) => root.querySelector('[data-status]')!.textContent;

afterEach(() => {
	document.body.innerHTML = '';
});

describe('searchable list component', () => {
	const ready = async (root: HTMLElement) => {
		await expect.poll(() => root.querySelector<HTMLElement>('li')?.tabIndex).toBe(0);
		return root;
	};
	const rows = (root: HTMLElement) => texts(root.querySelectorAll('li'));

	test('draws the label, field, every fruit and the status from its state', async () => {
		const root = await ready(await mountComponent('searchable-list'));

		expect(rows(root)).toEqual(['Apple', 'Apricot', 'Banana', 'Cherry', 'Date']);
		expect(status(root)).toBe('5 of 5 shown');
		expect(root.querySelector('label')!.htmlFor).toBe(root.querySelector('input')!.id);
	});

	test('filters as you type and the arrows walk the matches', async () => {
		const root = await ready(await mountComponent('searchable-list'));
		const input = root.querySelector('input')!;

		await userEvent.type(input, 'ap');
		expect(rows(root)).toEqual(['Apple', 'Apricot']);
		expect(status(root)).toBe('2 of 5 shown');
		expect(document.activeElement).toBe(input);

		await userEvent.keyboard('{ArrowDown}');
		expect(document.activeElement).toBe(root.querySelectorAll('li')[0]);
		await userEvent.keyboard('{ArrowDown}');
		expect(document.activeElement).toBe(root.querySelectorAll('li')[1]);
		await userEvent.keyboard('{Enter}');
		expect(status(root)).toBe('Chose Apricot');

		await userEvent.clear(input);
		await userEvent.type(input, 'ban');
		await userEvent.tab();
		expect(document.activeElement).toBe(root.querySelector('li'));
		expect(rows(root)).toEqual(['Banana']);

		await userEvent.clear(input);
		await userEvent.type(input, 'zzz');
		expect(rows(root)).toEqual([]);
		expect(status(root)).toBe('No matches');
	});

	test('removes every listener when the element leaves, and a fresh copy works', async () => {
		const tracker = trackListeners();
		let root!: HTMLElement;
		try {
			root = await ready(await mountComponent('searchable-list'));
			expect(tracker.live().length).toBeGreaterThan(0);
			root.remove();
			expect(tracker.live()).toEqual([]);
		} finally {
			tracker.stop();
		}

		const fresh = document.createElement('searchable-list-app');
		document.body.append(fresh);
		await ready(fresh);
		await userEvent.type(fresh.querySelector('input')!, 'ch');

		expect(rows(fresh)).toEqual(['Cherry']);
		expect(status(fresh)).toBe('1 of 5 shown');
	});
});
