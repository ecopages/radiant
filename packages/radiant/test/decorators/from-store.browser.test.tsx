import { waitFor } from '@testing-library/dom';
import { afterEach, describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { fromStore } from '../../src/decorators/from-store';
import { onUpdated } from '../../src/decorators/on-updated';

type CartState = { items: string[]; user: string };

function createCartStore(initial: CartState) {
	let current = initial;
	const listeners = new Set<() => void>();

	return {
		getState: () => current,
		listenerCount: () => listeners.size,
		setState(partial: Partial<CartState>) {
			current = { ...current, ...partial };
			for (const listener of [...listeners]) listener();
		},
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

let tag = 0;
const nextTag = (kind: string) => `from-store-${kind}-${++tag}`;

afterEach(() => {
	document.body.innerHTML = '';
});

describe('@fromStore', () => {
	test('reads the selected slice on the field and on this.$', async () => {
		const store = createCartStore({ items: ['mug'], user: 'Ada' });
		const tagName = nextTag('badge');
		let renders = 0;

		@customElement(tagName)
		class Badge extends RadiantElement<{ count: number }> {
			@fromStore(store, (state) => state.items.length)
			count!: number;

			override render() {
				renders += 1;
				return <span data-ref="count">{this.$.count}</span>;
			}
		}

		expect(customElements.get(tagName)).toBe(Badge);

		const host = document.createElement(tagName) as Badge;
		document.body.appendChild(host);
		await host.updateComplete;

		expect(host.count).toBe(1);
		expect(host.querySelector('[data-ref="count"]')?.textContent).toBe('1');
		expect(renders).toBe(1);

		store.setState({ user: 'Bea' });
		await host.updateComplete;
		expect(host.count).toBe(1);
		expect(renders).toBe(1);

		store.setState({ items: ['mug', 'lamp'] });
		await host.updateComplete;
		expect(host.count).toBe(2);
		expect(host.querySelector('[data-ref="count"]')?.textContent).toBe('2');
		expect(renders).toBe(1);
	});

	test('assignment throws and the store is unchanged', async () => {
		const store = createCartStore({ items: ['mug'], user: 'Ada' });
		const tagName = nextTag('assign');

		@customElement(tagName)
		class Badge extends RadiantElement<{ count: number }> {
			@fromStore(store, (state) => state.items.length)
			count!: number;
		}

		expect(customElements.get(tagName)).toBe(Badge);

		const host = document.createElement(tagName) as Badge;
		document.body.appendChild(host);
		await host.updateComplete;

		expect(() => {
			host.count = 9;
		}).toThrow(/read-only member/);
		expect(host.count).toBe(1);
		expect(store.getState().items).toEqual(['mug']);
	});

	test('releases the store on disconnect when the host has no live binding', async () => {
		const store = createCartStore({ items: ['mug'], user: 'Ada' });
		const tagName = nextTag('updated');
		const calls: number[] = [];

		@customElement(tagName)
		class Badge extends RadiantElement<{ count: number }> {
			@fromStore(store, (state) => state.items.length)
			count!: number;

			@onUpdated('count')
			onCount() {
				calls.push(this.count);
			}
		}

		expect(customElements.get(tagName)).toBe(Badge);

		const host = document.createElement(tagName) as Badge;
		document.body.appendChild(host);
		await host.updateComplete;
		expect(store.listenerCount()).toBeGreaterThan(0);
		calls.length = 0;
		store.setState({ items: ['mug', 'lamp'] });
		await waitFor(() => expect(calls).toEqual([2]));
		host.remove();
		expect(store.listenerCount()).toBe(0);
	});
});
