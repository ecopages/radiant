import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import { syncExamples } from '../src/components/primitive-example/mount-example';

const pages = import.meta.glob('../src/content/components/recipes/*.mdx', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>;
const scripts = import.meta.glob('../src/content/components/recipes/*.script.ts');
const elements = import.meta.glob('../src/content/components/recipes/*.element.ts');

/** Mounts the markup a recipe page documents and runs the script it documents. */
async function mountRecipe(slug: string): Promise<HTMLElement> {
	const page = pages[`../src/content/components/recipes/${slug}.mdx`]!;
	document.body.innerHTML = page.match(/```html\n([\s\S]*?)\n```/)![1];
	await scripts[`../src/content/components/recipes/${slug}.script.ts`]!();
	syncExamples();
	return document.querySelector<HTMLElement>(`[data-example="${slug}"]`)!;
}

type Form = 'plain' | 'radiant';

/**
 * Mounts one form of a recipe from its page: the plain form is the first `html` fence plus the `mount` script, the
 * Radiant form is the second `html` fence plus the element script, which needs no mount call. Returns the element the
 * recipe's parts sit under.
 */
async function mountForm(slug: string, form: Form): Promise<HTMLElement> {
	if (form === 'plain') {
		return mountRecipe(slug);
	}
	const page = pages[`../src/content/components/recipes/${slug}.mdx`]!;
	document.body.innerHTML = [...page.matchAll(/```html\n([\s\S]*?)\n```/g)][1]![1];
	await elements[`../src/content/components/recipes/${slug}.element.ts`]!();
	return document.querySelector<HTMLElement>(`recipe-${slug}`)!;
}

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

	test('swipe card follows the drag, springs back when short or diagonal, and is dismissed by a long drag, a flick or the button', async () => {
		const root = await mountRecipe('swipe-card');
		const card = root.querySelector<HTMLElement>('[data-card]')!;
		const dismiss = root.querySelector<HTMLElement>('[data-dismiss]')!;
		const restore = root.querySelector<HTMLButtonElement>('[data-restore]')!;
		const dismissed = () => expect.poll(() => card.hidden).toBe(true);

		pointer(dismiss, 'pointerdown', 10, 0);
		pointer(dismiss, 'pointerup', 200, 0);
		expect(card.hidden).toBe(false);

		pointer(card, 'pointerdown', 200, 0, 1000);
		pointer(card, 'pointermove', 170, 0, 1100);
		expect(card.style.getPropertyValue('--swipe-dx')).toBe('-30px');
		expect(card.hasAttribute('data-dragging')).toBe(true);
		pointer(card, 'pointerup', 170, 0, 1500);
		expect(card.style.getPropertyValue('--swipe-dx')).toBe('0px');
		expect(card.hasAttribute('data-dragging')).toBe(false);
		expect(card.hidden).toBe(false);

		pointer(card, 'pointerdown', 200, 0, 2000);
		pointer(card, 'pointerup', 100, 70, 2400);
		expect(card.style.getPropertyValue('--swipe-dx')).toBe('0px');
		expect(card.hidden).toBe(false);

		pointer(card, 'pointerdown', 200, 0, 3000);
		pointer(card, 'pointerup', 20, 0, 3500);
		await dismissed();
		expect(status(root)).toBe('Card dismissed, swiped left');

		restore.click();
		expect(card.hidden).toBe(false);

		pointer(card, 'pointerdown', 200, 0, 4000);
		pointer(card, 'pointerup', 170, 0, 4030);
		await dismissed();
		expect(status(root)).toBe('Card dismissed, swiped left');

		restore.click();
		await userEvent.click(dismiss);
		expect(card.hidden).toBe(true);
		expect(status(root)).toBe('Card dismissed');
		expect(document.activeElement).toBe(restore);
	});

	test('popover menu opens into the menu, walks the items and returns focus to the button', async () => {
		const root = await mountRecipe('popover-menu');
		const trigger = root.querySelector<HTMLElement>('button')!;
		const menu = root.querySelector<HTMLElement>('[role="menu"]')!;
		const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')];
		expect(menu.hidden).toBe(true);

		await userEvent.click(trigger);
		expect(menu.hidden).toBe(false);
		expect(trigger.getAttribute('aria-expanded')).toBe('true');
		expect(document.activeElement).toBe(items[0]);

		await userEvent.keyboard('{ArrowDown}');
		expect(document.activeElement).toBe(items[1]);

		await userEvent.keyboard('{Escape}');
		expect(menu.hidden).toBe(true);
		expect(document.activeElement).toBe(trigger);

		await userEvent.click(trigger);
		await userEvent.click(document.body);
		expect(menu.hidden).toBe(true);

		await userEvent.click(trigger);
		await userEvent.keyboard('{End}{Enter}');
		expect(menu.hidden).toBe(true);
		expect(status(root)).toBe('Chose Delete');
		expect(document.activeElement).toBe(trigger);
	});

	test('modal traps focus, locks scroll, closes three ways and returns focus to the opener', async () => {
		const root = await mountRecipe('modal');
		const opener = root.querySelector<HTMLElement>('[data-open]')!;
		const dialog = root.querySelector<HTMLElement>('[data-dialog]')!;
		const origin = dialog.parentElement!;
		const [confirm, cancel] = dialog.querySelectorAll<HTMLElement>('button');

		await userEvent.click(opener);
		expect(dialog.hidden).toBe(false);
		expect(dialog.parentElement).toBe(root);
		expect(document.documentElement.style.overflow).toBe('hidden');
		await expect.poll(() => document.activeElement).toBe(confirm);

		await userEvent.tab();
		expect(document.activeElement).toBe(cancel);
		await userEvent.tab();
		expect(document.activeElement).toBe(confirm);

		await userEvent.keyboard('{Escape}');
		expect(dialog.hidden).toBe(true);
		expect(dialog.parentElement).toBe(origin);
		expect(document.documentElement.style.overflow).toBe('');
		expect(document.activeElement).toBe(opener);

		await userEvent.click(opener);
		await userEvent.click(cancel);
		expect(dialog.hidden).toBe(true);
		expect(document.activeElement).toBe(opener);

		await userEvent.click(opener);
		pointer(document.body, 'pointerdown', 0, 0);
		expect(dialog.hidden).toBe(true);
		expect(document.activeElement).toBe(opener);

		await userEvent.click(opener);
		await userEvent.click(confirm);
		expect(dialog.hidden).toBe(true);
		expect(status(root)).toBe('Deleted');
		expect(document.activeElement).toBe(root.querySelector('[data-next]'));

		await userEvent.click(opener);
		await userEvent.keyboard('{Escape}');
		expect(document.activeElement).toBe(opener);
	});
});
