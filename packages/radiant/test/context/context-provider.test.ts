// @vitest-environment happy-dom
import { describe, expect, test } from 'vitest';
import { ContextProvider } from '../../src/context/context-provider';
import type { ContextHostLike } from '../../src/context/context-host';
import { createContext } from '../../src/context/create-context';

type DeliveryContext = {
	value: number;
};

function createDeliveryProvider() {
	const host = document.createElement('div') as unknown as ContextHostLike;
	const context = createContext<DeliveryContext>(Symbol('context-delivery'));
	const provider = new ContextProvider(host, {
		context,
		initialValue: { value: 1 },
	});

	return { provider };
}

describe('ContextProvider notification', () => {
	test('notifies later subscribers when an earlier subscriber unsubscribes itself', () => {
		const { provider } = createDeliveryProvider();
		const received: string[] = [];

		provider.subscribe({
			callback: (_value, unsubscribe) => {
				received.push('a');
				unsubscribe?.();
			},
		});
		provider.subscribe({
			callback: () => {
				received.push('b');
			},
		});

		provider.setContext({ value: 2 });

		expect(received).toEqual(['a', 'b']);
		expect(provider.subscriptions).toHaveLength(1);
	});

	test('skips a later subscriber that was removed during the same delivery', () => {
		const { provider } = createDeliveryProvider();
		const received: string[] = [];
		let unsubscribeB: (() => void) | undefined;

		provider.subscribe({
			callback: () => {
				received.push('a');
				unsubscribeB?.();
			},
		});
		unsubscribeB = provider.subscribe({
			callback: () => {
				received.push('b');
			},
		});

		provider.setContext({ value: 2 });

		expect(received).toEqual(['a']);
		expect(provider.subscriptions).toHaveLength(1);
	});

	test('does not notify a subscriber added during delivery until the next update', () => {
		const { provider } = createDeliveryProvider();
		const received: string[] = [];
		let addedDuringDelivery = false;

		provider.subscribe({
			callback: () => {
				received.push('a');
				if (addedDuringDelivery) {
					return;
				}

				addedDuringDelivery = true;
				provider.subscribe({
					callback: () => {
						received.push('c');
					},
				});
			},
		});
		provider.subscribe({
			callback: () => {
				received.push('b');
			},
		});

		provider.setContext({ value: 2 });
		expect(received).toEqual(['a', 'b']);

		provider.setContext({ value: 3 });
		expect(received).toEqual(['a', 'b', 'a', 'b', 'c']);
	});
});
