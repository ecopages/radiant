import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/swipe-card.css';
import { mountComponent, trackListeners } from './mount-recipe';
import { until } from './until';

function pointer(target: Element, type: string, x: number, y: number, timeStamp?: number): void {
	const event = new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, clientX: x, clientY: y });
	if (timeStamp !== undefined) {
		Object.defineProperty(event, 'timeStamp', { value: timeStamp });
	}
	target.dispatchEvent(event);
}

afterEach(() => {
	document.body.innerHTML = '';
});

describe('swipe card component', () => {
	const ready = async (root: HTMLElement) => {
		await until(() => expect(root.querySelector('[data-swipe-card]')).not.toBeNull());
		return {
			root,
			card: root.querySelector<HTMLElement>('[data-swipe-card]')!,
			dismiss: root.querySelector<HTMLElement>('[data-dismiss]')!,
			restore: root.querySelector<HTMLButtonElement>('[data-restore]')!,
			status: () => root.querySelector('[data-status]')!.textContent,
		};
	};

	test('draws the card, the buttons and the status line from its state', async () => {
		const { card, restore, status } = await ready(await mountComponent('swipe-card'));

		expect(card.hidden).toBe(false);
		expect(card.querySelector('span')!.textContent).toBe('Your report is ready');
		expect(restore.hidden).toBe(true);
		expect(status()).toBe('The card is shown');
	});

	test('follows the drag, springs back when short or diagonal, and is dismissed by a long drag or a flick', async () => {
		const { card, dismiss, restore, status } = await ready(await mountComponent('swipe-card'));

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
		expect(card.hidden).toBe(false);

		pointer(card, 'pointerdown', 200, 0, 3000);
		pointer(card, 'pointerup', 20, 0, 3500);
		await until(() => expect(card.hidden).toBe(true));
		expect(status()).toBe('Card dismissed, swiped left');
		await until(() => expect(restore.hidden).toBe(false));

		restore.click();
		await until(() => expect(card.hidden).toBe(false));

		pointer(card, 'pointerdown', 200, 0, 4000);
		pointer(card, 'pointerup', 170, 0, 4030);
		await until(() => expect(card.hidden).toBe(true));
		expect(status()).toBe('Card dismissed, swiped left');
	});

	test('the button dismisses the card and moves focus to the restore button', async () => {
		const { card, dismiss, restore, status } = await ready(await mountComponent('swipe-card'));

		await userEvent.click(dismiss);

		await until(() => expect(card.hidden).toBe(true));
		expect(status()).toBe('Card dismissed');
		await until(() => expect(document.activeElement).toBe(restore));
	});

	test('a swipe while the Dismiss button has focus moves focus to the restore button', async () => {
		const { card, dismiss, restore } = await ready(await mountComponent('swipe-card'));

		dismiss.focus();
		pointer(card, 'pointerdown', 200, 0, 1000);
		pointer(card, 'pointerup', 20, 0, 1500);
		await until(() => expect(card.hidden).toBe(true));

		await until(() => expect(document.activeElement).toBe(restore));
	});

	test('restoring brings the card back at rest and returns focus to the dismiss button', async () => {
		const { card, dismiss, restore, status } = await ready(await mountComponent('swipe-card'));
		pointer(card, 'pointerdown', 200, 0, 1000);
		pointer(card, 'pointerup', 20, 0, 1500);
		await until(() => expect(card.hidden).toBe(true));
		await until(() => expect(restore.hidden).toBe(false));

		await userEvent.click(restore);

		await until(() => expect(card.hidden).toBe(false));
		expect(restore.hidden).toBe(true);
		expect(card.style.getPropertyValue('--swipe-dx')).toBe('0px');
		expect(card.style.getPropertyValue('--swipe-opacity')).toBe('1');
		expect(status()).toBe('The card is shown');
		await until(() => expect(document.activeElement).toBe(dismiss));
	});

	test('a mouse drag across the card dismisses it', async () => {
		const { root, card } = await ready(await mountComponent('swipe-card'));
		const target = document.body.appendChild(document.createElement('div'));
		const box = card.getBoundingClientRect();
		target.style.cssText = `position: fixed; top: ${box.top}px; left: ${box.right + 10}px; width: 40px; height: 20px`;

		await userEvent.dragAndDrop(card.querySelector('span')!, target);

		await until(() => expect(card.hidden).toBe(true));
		expect(root.querySelector('[data-status]')!.textContent).toBe('Card dismissed, swiped right');
	});

	test('removes every listener when the element leaves, and a fresh copy works', async () => {
		const tracker = trackListeners();
		let root!: HTMLElement;
		try {
			root = (await ready(await mountComponent('swipe-card'))).root;
			expect(tracker.live().length).toBeGreaterThan(0);
			root.remove();
			expect(tracker.live()).toEqual([]);
		} finally {
			tracker.stop();
		}

		const fresh = document.createElement('swipe-card-app');
		document.body.append(fresh);
		const { card, status } = await ready(fresh);
		pointer(card, 'pointerdown', 200, 0, 1000);
		pointer(card, 'pointermove', 170, 0, 1100);
		expect(card.style.getPropertyValue('--swipe-dx')).toBe('-30px');
		pointer(card, 'pointerup', 20, 0, 1500);
		await until(() => expect(card.hidden).toBe(true));
		expect(status()).toBe('Card dismissed, swiped left');
	});
});
