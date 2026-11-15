import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';
import { mountController, trackListeners } from './mount-recipe';

const status = (root: HTMLElement) => root.querySelector('[data-status]')!.textContent;
const texts = (nodes: Iterable<Element>) => [...nodes].map((node) => node.textContent);
const shown = (root: HTMLElement) => [...root.querySelectorAll('li')].filter((li) => !li.hidden);
const macrotask = () => new Promise((resolve) => setTimeout(resolve));

afterEach(() => {
	document.body.innerHTML = '';
});

describe('searchable list Radiant controller', () => {
	test('filters as you type and the arrows walk the matches', async () => {
		const root = await mountController('searchable-list');
		const input = root.querySelector('input')!;
		await expect.poll(() => root.querySelector('li')!.tabIndex).toBe(0);

		await userEvent.type(input, 'ap');
		expect(texts(shown(root))).toEqual(['Apple', 'Apricot']);
		expect(status(root)).toBe('2 of 5 shown');

		await userEvent.keyboard('{ArrowDown}');
		expect(document.activeElement).toBe(shown(root)[0]);
		await userEvent.keyboard('{ArrowDown}');
		expect(document.activeElement).toBe(shown(root)[1]);
		await userEvent.keyboard('{Enter}');
		expect(status(root)).toBe('Chose Apricot');

		await userEvent.clear(input);
		await userEvent.type(input, 'ban');
		await userEvent.tab();
		expect(document.activeElement).toBe(shown(root)[0]);
		expect(texts(shown(root))).toEqual(['Banana']);

		await userEvent.clear(input);
		await userEvent.type(input, 'zzz');
		expect(status(root)).toBe('No matches');
	});

	test('has a visible label tied to its field', async () => {
		const root = await mountController('searchable-list');

		expect(root.querySelector('label')!.htmlFor).toBe(root.querySelector('input')!.id);
	});

	test('removes every listener when the element leaves and starts again on a fresh copy', async () => {
		const tracker = trackListeners();
		let root: HTMLElement;
		try {
			root = await mountController('searchable-list');
			await expect.poll(() => root.querySelector('li')!.tabIndex).toBe(0);
			expect(tracker.live().length).toBeGreaterThan(0);
			root.remove();
			await macrotask();
			expect(tracker.live(document, window)).toEqual([]);
			expect(tracker.live(root, ...root.querySelectorAll('*'))).toEqual([]);
		} finally {
			tracker.stop();
		}

		const fresh = root.cloneNode(true) as HTMLElement;
		document.body.append(fresh);
		await expect.poll(() => fresh.querySelector('li')!.tabIndex).toBe(0);
		await userEvent.type(fresh.querySelector('input')!, 'ch');
		expect(texts(shown(fresh))).toEqual(['Cherry']);
		expect(status(fresh)).toBe('1 of 5 shown');
	});
});
