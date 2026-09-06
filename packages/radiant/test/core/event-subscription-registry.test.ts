// @vitest-environment happy-dom
import { describe, expect, test } from 'vitest';
import { EventSubscriptionRegistry } from '../../src/core/event-subscription-registry';

function createHostWithButton(): { host: HTMLDivElement; button: HTMLButtonElement } {
	const host = document.createElement('div');
	const button = document.createElement('button');
	button.setAttribute('data-ref', 'click-me');
	host.appendChild(button);
	document.body.appendChild(host);
	return { host, button };
}

describe('EventSubscriptionRegistry', () => {
	test('keeps duplicate type and selector registrations independent', () => {
		const { host, button } = createHostWithButton();
		const registry = new EventSubscriptionRegistry(
			() => host,
			() => host,
		);
		const selector = '[data-ref="click-me"]';
		let aCount = 0;
		let bCount = 0;

		const unsubscribeA = registry.subscribe({
			selector,
			type: 'click',
			listener: () => {
				aCount += 1;
			},
		});
		const unsubscribeB = registry.subscribe({
			selector,
			type: 'click',
			listener: () => {
				bCount += 1;
			},
		});

		expect(registry.hasEventSubscription('click:[data-ref="click-me"]')).toBe(true);

		button.click();
		expect(aCount).toBe(1);
		expect(bCount).toBe(1);

		unsubscribeA();
		expect(registry.hasEventSubscription('click:[data-ref="click-me"]')).toBe(true);

		button.click();
		expect(aCount).toBe(1);
		expect(bCount).toBe(2);

		unsubscribeB();
		expect(registry.hasEventSubscription('click:[data-ref="click-me"]')).toBe(false);

		button.click();
		expect(aCount).toBe(1);
		expect(bCount).toBe(2);

		host.remove();
	});

	test('repeating a stale cleanup does not remove a later registration with the same selector', () => {
		const { host, button } = createHostWithButton();
		const registry = new EventSubscriptionRegistry(
			() => host,
			() => host,
		);
		const selector = '[data-ref="click-me"]';
		let aCount = 0;
		let cCount = 0;

		const unsubscribeA = registry.subscribe({
			selector,
			type: 'click',
			listener: () => {
				aCount += 1;
			},
		});
		unsubscribeA();

		registry.subscribe({
			selector,
			type: 'click',
			listener: () => {
				cCount += 1;
			},
		});

		unsubscribeA();
		button.click();

		expect(aCount).toBe(0);
		expect(cCount).toBe(1);
		expect(registry.hasEventSubscription('click:[data-ref="click-me"]')).toBe(true);

		host.remove();
	});

	test('removeAll unsubscribes every duplicate registration', () => {
		const { host, button } = createHostWithButton();
		const registry = new EventSubscriptionRegistry(
			() => host,
			() => host,
		);
		const selector = '[data-ref="click-me"]';
		let aCount = 0;
		let bCount = 0;

		registry.subscribe({
			selector,
			type: 'click',
			listener: () => {
				aCount += 1;
			},
		});
		registry.subscribe({
			selector,
			type: 'click',
			listener: () => {
				bCount += 1;
			},
		});

		button.click();
		registry.removeAll();
		button.click();

		expect(aCount).toBe(1);
		expect(bCount).toBe(1);
		expect(registry.hasEventSubscription('click:[data-ref="click-me"]')).toBe(false);

		host.remove();
	});
});
