import { describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { fromStore as legacyFromStore } from '../../src/decorators/legacy/from-store';
import { fromStore } from '../../src/decorators/from-store';

function createCountStore(initial: number) {
	let current = initial;
	const listeners = new Set<() => void>();

	return {
		getState: () => current,
		setState(next: number) {
			current = next;
			for (const listener of [...listeners]) listener();
		},
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

function defineLegacyFromStoreElement(tagName: string, store: ReturnType<typeof createCountStore>) {
	class LegacyFromStoreElement extends RadiantElement<{ count: number }> {
		count!: number;
	}

	legacyFromStore(store)(LegacyFromStoreElement.prototype, 'count');
	customElements.define(tagName, LegacyFromStoreElement);
	return LegacyFromStoreElement;
}

function defineStandardFromStoreElement(tagName: string, store: ReturnType<typeof createCountStore>) {
	class StandardFromStoreElement extends RadiantElement<{ count: number }> {
		@fromStore(store)
		count!: number;
	}

	customElements.define(tagName, StandardFromStoreElement);
	return StandardFromStoreElement;
}

describe('@fromStore standard vs legacy parity', () => {
	test('RadiantElement exposes the selected value and bindings', () => {
		const store = createCountStore(3);
		defineLegacyFromStoreElement('legacy-from-store-parity-element', store);
		defineStandardFromStoreElement('standard-from-store-parity-element', store);

		const legacyElement = document.createElement('legacy-from-store-parity-element') as RadiantElement<{
			count: number;
		}> & { count: number };
		const standardElement = document.createElement('standard-from-store-parity-element') as RadiantElement<{
			count: number;
		}> & { count: number };

		document.body.append(legacyElement, standardElement);

		expect(legacyElement.count).toBe(3);
		expect(standardElement.count).toBe(3);
		expect(legacyElement.$.count.getValue()).toBe(3);
		expect(standardElement.$.count.getValue()).toBe(3);

		store.setState(8);

		expect(legacyElement.count).toBe(8);
		expect(standardElement.count).toBe(8);
		expect(legacyElement.$.count.getValue()).toBe(8);
		expect(standardElement.$.count.getValue()).toBe(8);

		legacyElement.remove();
		standardElement.remove();
	});
});
