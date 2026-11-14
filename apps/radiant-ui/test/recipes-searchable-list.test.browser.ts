import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import { mountForm, trackListeners, type Form } from './mount-recipe';

const status = (root: HTMLElement) => root.querySelector('[data-status]')!.textContent;
const texts = (nodes: Iterable<Element>) => [...nodes].map((node) => node.textContent);

afterEach(() => {
	document.body.innerHTML = '';
	document.documentElement.removeAttribute('style');
});

describe('recipes', () => {
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
		const tracker = trackListeners();
		let root: HTMLElement;
		try {
			root = await mountForm('searchable-list', 'radiant');
			await expect.poll(() => root.querySelector('li')!.tabIndex).toBe(0);
			expect(tracker.live().length).toBeGreaterThan(0);
			root.remove();
			expect(tracker.live()).toEqual([]);
		} finally {
			tracker.stop();
		}

		const fresh = root.cloneNode(true) as HTMLElement;
		document.body.append(fresh);
		await expect.poll(() => fresh.querySelector('li')!.tabIndex).toBe(0);
		await userEvent.type(fresh.querySelector('input')!, 'ch');
		expect(texts([...fresh.querySelectorAll('li')].filter((li) => !li.hidden))).toEqual(['Cherry']);
		expect(status(fresh)).toBe('1 of 5 shown');
	});
});
