import { afterEach, describe, expect, test, vi } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { bindTo } from '../../src/decorators/bind-to';
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
	vi.restoreAllMocks();
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
		await host.updateComplete;
		expect(calls).toEqual([2]);
		host.remove();
		expect(store.listenerCount()).toBe(0);
	});

	test('reads the snapshot before connect without subscribing', () => {
		const store = createCartStore({ items: ['mug', 'lamp'], user: 'Ada' });
		const tagName = nextTag('unconnected');

		@customElement(tagName)
		class Badge extends RadiantElement<{ count: number }> {
			@fromStore(store, (state) => state.items.length)
			count!: number;
		}

		expect(customElements.get(tagName)).toBe(Badge);

		const host = document.createElement(tagName) as Badge;

		expect(host.count).toBe(2);
		expect(store.listenerCount()).toBe(0);
	});

	test('@bindTo paints the selected slice and the store is released on disconnect', async () => {
		const store = createCartStore({ items: ['mug'], user: 'Ada' });
		const tagName = nextTag('bind-to');

		@customElement(tagName)
		class Badge extends RadiantElement<{ count: number }> {
			@bindTo({ attr: 'data-count' })
			@fromStore(store, (state) => state.items.length)
			count!: number;
		}

		expect(customElements.get(tagName)).toBe(Badge);

		const host = document.createElement(tagName) as Badge;
		document.body.appendChild(host);
		await host.updateComplete;

		expect(host.getAttribute('data-count')).toBe('1');

		store.setState({ items: ['mug', 'lamp'] });

		expect(host.getAttribute('data-count')).toBe('2');

		host.remove();

		expect(store.listenerCount()).toBe(0);
	});

	test('a field bound with this.$ and also read in render() warns once, naming the field', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const store = createCartStore({ items: ['mug'], user: 'Ada' });
		const tagName = nextTag('redundant');

		@customElement(tagName)
		class Badge extends RadiantElement<{ count: number }> {
			@fromStore(store, (state) => state.items.length)
			count!: number;

			override render() {
				return (
					<p>
						{this.count} <b>{this.$.count}</b>
					</p>
				);
			}
		}

		expect(customElements.get(tagName)).toBe(Badge);

		const host = document.createElement(tagName) as Badge;
		document.body.appendChild(host);
		await host.updateComplete;
		store.setState({ items: ['mug', 'lamp'] });
		await host.updateComplete;
		store.setState({ items: ['mug', 'lamp', 'vase'] });
		await host.updateComplete;

		expect(warn).toHaveBeenCalledTimes(1);
		const message = String(warn.mock.calls[0]?.[0]);
		expect(message).toContain(`<${tagName}>`);
		expect(message).toContain('"count"');
		expect(message).toContain('this.$.count');
	});

	test('a field initializer is ignored for the store snapshot and warns once per class and field', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const store = createCartStore({ items: ['mug'], user: 'Ada' });
		const tagName = nextTag('initializer');

		@customElement(tagName)
		class InitializedBadge extends RadiantElement<{ count: number }> {
			@fromStore(store, (state) => state.items.length)
			count = 5;
		}

		expect(customElements.get(tagName)).toBe(InitializedBadge);

		const first = document.createElement(tagName) as InitializedBadge;
		const second = document.createElement(tagName) as InitializedBadge;
		document.body.append(first, second);
		await first.updateComplete;

		expect(first.count).toBe(1);
		expect(second.count).toBe(1);
		expect(warn).toHaveBeenCalledTimes(1);
		const message = String(warn.mock.calls[0]?.[0]);
		expect(message).toContain('"count"');
		expect(message).toContain('InitializedBadge');
		expect(message).toContain('initializer is ignored');
	});

	test('a field without an initializer does not warn', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const store = createCartStore({ items: ['mug'], user: 'Ada' });
		const tagName = nextTag('declared');

		@customElement(tagName)
		class Badge extends RadiantElement<{ count: number }> {
			@fromStore(store, (state) => state.items.length)
			count!: number;
		}

		expect(customElements.get(tagName)).toBe(Badge);

		const host = document.createElement(tagName) as Badge;
		document.body.append(host);
		await host.updateComplete;

		expect(host.count).toBe(1);
		expect(warn).not.toHaveBeenCalled();
	});
});
