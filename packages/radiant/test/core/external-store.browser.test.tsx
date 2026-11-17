import { fromExternalStore } from '@ecopages/signals';
import { afterEach, describe, expect, test } from 'vitest';
import {
	type ContextProvider,
	consumeContext,
	createContext,
	onContextUpdate,
	provideContext,
} from '../../src/context';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
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
const nextTag = (kind: string) => `external-store-${kind}-${++tag}`;

afterEach(() => {
	document.body.innerHTML = '';
});

describe('fromExternalStore on a host', () => {
	test('this.$ patches the bound node without re-running render', async () => {
		const store = createCartStore({ items: ['mug'], user: 'Ada' });
		const tagName = nextTag('badge');
		let renders = 0;

		@customElement(tagName)
		class Badge extends RadiantElement<{ count: number }> {
			constructor() {
				super();
				this.registerReactiveMember(
					'count',
					fromExternalStore(store, (state) => state.items.length),
				);
			}

			override render() {
				renders += 1;
				return <span data-ref="count">{this.$.count}</span>;
			}
		}

		const host = document.createElement(tagName) as Badge;
		document.body.appendChild(host);
		await host.updateComplete;

		expect(renders).toBe(1);
		expect(host.querySelector('[data-ref="count"]')?.textContent).toBe('1');
		expect(store.listenerCount()).toBeGreaterThan(0);

		store.setState({ items: ['mug', 'lamp'] });
		await host.updateComplete;

		expect(renders).toBe(1);
		expect(host.querySelector('[data-ref="count"]')?.textContent).toBe('2');
	});

	test('a host without a live binding releases the store on disconnect', async () => {
		const store = createCartStore({ items: ['mug'], user: 'Ada' });
		const tagName = nextTag('updated');
		const calls: number[] = [];

		@customElement(tagName)
		class Badge extends RadiantElement<{ count: number }> {
			constructor() {
				super();
				this.registerReactiveMember(
					'count',
					fromExternalStore(store, (state) => state.items.length),
				);
			}

			@onUpdated('count')
			onCount() {
				calls.push(this.getReactiveMember<number>('count')!.get());
			}
		}

		const host = document.createElement(tagName) as Badge;
		document.body.appendChild(host);
		await host.updateComplete;
		expect(store.listenerCount()).toBeGreaterThan(0);
		host.remove();
		expect(store.listenerCount()).toBe(0);
	});

	test('reconnect takes over a write made while the host was detached', async () => {
		const store = createCartStore({ items: ['mug'], user: 'Ada' });
		const tagName = nextTag('reconnect');

		@customElement(tagName)
		class Badge extends RadiantElement<{ count: number }> {
			constructor() {
				super();
				this.registerReactiveMember(
					'count',
					fromExternalStore(store, (state) => state.items.length),
				);
			}

			override render() {
				return <span data-ref="count">{this.$.count}</span>;
			}
		}

		const host = document.createElement(tagName) as Badge;
		document.body.appendChild(host);
		await host.updateComplete;
		host.remove();
		store.setState({ items: ['mug', 'lamp', 'vase'] });
		document.body.appendChild(host);
		await host.updateComplete;

		expect(host.querySelector('[data-ref="count"]')?.textContent).toBe('3');
	});

	test('context descendants subscribe to their own slice of the provided store', async () => {
		const store = createCartStore({ items: ['mug'], user: 'Ada' });
		const cartContext = createContext<typeof store>(Symbol('cart-store'));
		const rootTag = nextTag('root');
		const badgeTag = nextTag('ctx-badge');
		const userTag = nextTag('ctx-user');
		let badgeRenders = 0;
		let userRenders = 0;

		@customElement(rootTag)
		class Root extends RadiantElement {
			@provideContext<typeof cartContext>({ context: cartContext, initialValue: store })
			cart!: ContextProvider<typeof cartContext>;
		}

		@customElement(badgeTag)
		class Badge extends RadiantElement<{ count: number }> {
			@consumeContext(cartContext)
			cart?: ContextProvider<typeof cartContext>;

			@onContextUpdate({ context: cartContext })
			onCart(next: typeof store) {
				this.registerReactiveMember(
					'count',
					fromExternalStore(next, (state) => state.items.length),
				);
			}

			override render() {
				badgeRenders += 1;
				return <span data-ref="count">{this.$.count}</span>;
			}
		}

		@customElement(userTag)
		class UserChip extends RadiantElement<{ user: string }> {
			@consumeContext(cartContext)
			cart?: ContextProvider<typeof cartContext>;

			@onContextUpdate({ context: cartContext })
			onCart(next: typeof store) {
				this.registerReactiveMember(
					'user',
					fromExternalStore(next, (state) => state.user),
				);
			}

			override render() {
				userRenders += 1;
				return <span data-ref="user">{this.$.user}</span>;
			}
		}

		expect(customElements.get(rootTag)).toBe(Root);
		document.body.innerHTML = `<${rootTag}><${badgeTag}></${badgeTag}><${userTag}></${userTag}></${rootTag}>`;
		const badge = document.querySelector(badgeTag) as Badge;
		const user = document.querySelector(userTag) as UserChip;
		await badge.updateComplete;
		await user.updateComplete;

		expect(badge.querySelector('[data-ref="count"]')?.textContent).toBe('1');
		expect(user.querySelector('[data-ref="user"]')?.textContent).toBe('Ada');
		const badgeAfterConnect = badgeRenders;
		const userAfterConnect = userRenders;

		store.setState({ items: ['mug', 'lamp'] });
		await badge.updateComplete;
		await user.updateComplete;

		expect(badge.querySelector('[data-ref="count"]')?.textContent).toBe('2');
		expect(user.querySelector('[data-ref="user"]')?.textContent).toBe('Ada');
		expect(badgeRenders).toBe(badgeAfterConnect);
		expect(userRenders).toBe(userAfterConnect);

		store.setState({ user: 'Grace' });
		await badge.updateComplete;
		await user.updateComplete;

		expect(badge.querySelector('[data-ref="count"]')?.textContent).toBe('2');
		expect(user.querySelector('[data-ref="user"]')?.textContent).toBe('Grace');
		expect(badgeRenders).toBe(badgeAfterConnect);
		expect(userRenders).toBe(userAfterConnect);
	});
});
