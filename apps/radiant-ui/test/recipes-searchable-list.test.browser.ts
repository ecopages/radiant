import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import { mountForm, type Form } from './mount-recipe';

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
});
