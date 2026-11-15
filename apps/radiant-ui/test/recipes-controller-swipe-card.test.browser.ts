import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/swipe-card.css';
import { mountController, trackListeners } from './mount-recipe';

function pointer(target: Element, type: string, x: number, y: number, timeStamp?: number): void {
	const event = new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, clientX: x, clientY: y });
	if (timeStamp !== undefined) {
		Object.defineProperty(event, 'timeStamp', { value: timeStamp });
	}
	target.dispatchEvent(event);
}

const macrotask = () => new Promise<void>((resolve) => setTimeout(resolve));

afterEach(() => {
	document.body.innerHTML = '';
});

describe('swipe card Radiant controller form', () => {
	const mount = async () => {
		const root = await mountController('swipe-card');
		return {
			root,
			card: root.querySelector<HTMLElement>('[data-swipe-card]')!,
			dismiss: root.querySelector<HTMLElement>('[data-dismiss]')!,
			restore: root.querySelector<HTMLButtonElement>('[data-restore]')!,
			status: () => root.querySelector('[data-status]')!.textContent,
		};
	};

	test('follows the drag, springs back when short or diagonal, and is dismissed by a long drag or a flick', async () => {
		const { card, dismiss, restore, status } = await mount();

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
		await expect.poll(() => card.hidden).toBe(true);
		expect(status()).toBe('Card dismissed, swiped left');
		expect(restore.hidden).toBe(false);

		restore.click();
		expect(card.hidden).toBe(false);

		pointer(card, 'pointerdown', 200, 0, 4000);
		pointer(card, 'pointerup', 170, 0, 4030);
		await expect.poll(() => card.hidden).toBe(true);
		expect(status()).toBe('Card dismissed, swiped left');
	});

	test('the button dismisses the card and moves focus to the restore button', async () => {
		const { card, dismiss, restore, status } = await mount();

		await userEvent.click(dismiss);

		expect(card.hidden).toBe(true);
		expect(status()).toBe('Card dismissed');
		expect(document.activeElement).toBe(restore);
	});

	test('a swipe while the Dismiss button has focus moves focus to the restore button', async () => {
		const { card, dismiss, restore } = await mount();

		dismiss.focus();
		pointer(card, 'pointerdown', 200, 0, 1000);
		pointer(card, 'pointerup', 20, 0, 1500);
		await expect.poll(() => card.hidden).toBe(true);

		expect(document.activeElement).toBe(restore);
	});

	test('restoring brings the card back at rest and returns focus to the dismiss button', async () => {
		const { card, dismiss, restore, status } = await mount();
		pointer(card, 'pointerdown', 200, 0, 1000);
		pointer(card, 'pointerup', 20, 0, 1500);
		await expect.poll(() => card.hidden).toBe(true);

		await userEvent.click(restore);

		expect(card.hidden).toBe(false);
		expect(restore.hidden).toBe(true);
		expect(card.style.getPropertyValue('--swipe-dx')).toBe('0px');
		expect(card.style.getPropertyValue('--swipe-opacity')).toBe('1');
		expect(status()).toBe('The card is shown');
		expect(document.activeElement).toBe(dismiss);
	});

	test('a mouse drag across the card dismisses it', async () => {
		const { card, status } = await mount();
		const target = document.body.appendChild(document.createElement('div'));
		const box = card.getBoundingClientRect();
		target.style.cssText = `position: fixed; top: ${box.top}px; left: ${box.right + 10}px; width: 40px; height: 20px`;

		await userEvent.dragAndDrop(card.querySelector('span')!, target);

		await expect.poll(() => card.hidden).toBe(true);
		expect(status()).toBe('Card dismissed, swiped right');
	});

	test('removes every listener when the element leaves, and a fresh copy works', async () => {
		const tracker = trackListeners();
		let root!: HTMLElement;
		try {
			root = (await mount()).root;
			expect(tracker.live(root.querySelector('[data-swipe-card]')!).length).toBeGreaterThan(0);
			root.remove();
			await macrotask();
			expect(tracker.live(document, window)).toEqual([]);
			expect(tracker.live()).toEqual([]);
		} finally {
			tracker.stop();
		}

		const fresh = root.cloneNode(true) as HTMLElement;
		document.body.append(fresh);
		await macrotask();
		const card = fresh.querySelector<HTMLElement>('[data-swipe-card]')!;
		pointer(card, 'pointerdown', 200, 0, 1000);
		pointer(card, 'pointermove', 170, 0, 1100);
		expect(card.style.getPropertyValue('--swipe-dx')).toBe('-30px');
		pointer(card, 'pointerup', 20, 0, 1500);
		await expect.poll(() => card.hidden).toBe(true);
		expect(fresh.querySelector('[data-status]')!.textContent).toBe('Card dismissed, swiped left');
	});
});
