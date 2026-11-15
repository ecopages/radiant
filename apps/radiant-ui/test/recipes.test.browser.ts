import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import '../src/content/components/recipes/calendar-events.css';

const pages = import.meta.glob('../src/content/components/recipes/*.mdx', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>;
let mounts = 0;

/**
 * Mounts the markup a recipe page documents and runs the script it documents, so the page and the example cannot
 * drift apart. The query makes the browser run the script again on every mount instead of reusing the first run.
 */
async function mountRecipe(slug: string): Promise<HTMLElement> {
	const markup = pages[`../src/content/components/recipes/${slug}.mdx`]!.match(/```html\n([\s\S]*?)\n```/)![1];
	document.body.innerHTML = markup;
	await import(/* @vite-ignore */ `/src/content/components/recipes/${slug}.script.ts?mount=${(mounts += 1)}`);
	return document.querySelector<HTMLElement>(`[data-example="${slug}"]`)!;
}

afterEach(() => {
	document.body.innerHTML = '';
});

describe('calendar-events recipe', () => {
	const day = (root: HTMLElement, iso: string) => root.querySelector<HTMLElement>(`[data-iso="${iso}"]`)!;
	const titles = (root: HTMLElement, iso: string) =>
		[...day(root, iso).querySelectorAll('[data-event]')].map((event) => event.textContent);

	test('a pointer drag moves an event to another day', async () => {
		const root = await mountRecipe('calendar-events');

		await userEvent.dragAndDrop(day(root, '2026-11-12').querySelector('[data-event]')!, day(root, '2026-11-13'));

		expect(titles(root, '2026-11-12')).toEqual([]);
		expect(titles(root, '2026-11-13')).toEqual(['Launch day']);
	});

	test('the keyboard walks the days, lifts an event, moves it to the next day and announces it', async () => {
		const root = await mountRecipe('calendar-events');
		day(root, '2026-11-01').focus();

		await userEvent.keyboard('{ArrowRight}{ArrowDown}{ArrowUp}{ArrowRight}');
		expect(document.activeElement).toBe(day(root, '2026-11-03'));

		await userEvent.keyboard('{Enter} {PageDown} ');

		expect(titles(root, '2026-11-03')).toEqual(['Standup']);
		expect(titles(root, '2026-11-04')).toEqual(['Design review']);
		expect(document.activeElement).toBe(day(root, '2026-11-04').querySelector('[data-event]'));
		expect(root.querySelector('[data-status]')!.textContent).toContain('Dropped Design review');
	});

	test('the filter leaves out the events that do not match', async () => {
		const root = await mountRecipe('calendar-events');

		await userEvent.fill(root.querySelector('input')!, 'stand');

		expect(titles(root, '2026-11-03')).toEqual(['Standup']);
		expect(root.querySelectorAll('[data-event]')).toHaveLength(1);
	});
});
