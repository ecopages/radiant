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
