import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/popover-menu.css';
import { mountForm, trackListeners, type Form } from './mount-recipe';

function pointer(target: Element, type: string, x: number, y: number, timeStamp?: number): void {
	const event = new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, clientX: x, clientY: y });
	if (timeStamp !== undefined) {
		Object.defineProperty(event, 'timeStamp', { value: timeStamp });
	}
	target.dispatchEvent(event);
}

const status = (root: HTMLElement) => root.querySelector('[data-status]')!.textContent;

afterEach(() => {
	document.body.innerHTML = '';
});

describe.each<Form>(['plain', 'radiant'])('swipe card with a real mouse (%s form)', (form) => {
	test('a mouse drag across the card dismisses it', async () => {
		const root = await mountForm('swipe-card', form);
		const card = root.querySelector<HTMLElement>('[data-card]')!;
		await expect.poll(() => root.querySelector('[data-card]')).not.toBeNull();
		const target = document.body.appendChild(document.createElement('div'));
		const box = card.getBoundingClientRect();
		target.style.cssText = `position: fixed; top: ${box.top}px; left: ${box.right + 10}px; width: 40px; height: 20px`;

		await userEvent.dragAndDrop(card.querySelector('span')!, target);

		await expect.poll(() => card.hidden).toBe(true);
		expect(status(root)).toBe('Card dismissed, swiped right');
	});
});

describe.each<Form>(['plain', 'radiant'])('swipe card (%s form)', (form) => {
	const mount = async () => {
		const root = await mountForm('swipe-card', form);
		const card = root.querySelector<HTMLElement>('[data-card]')!;
		await expect.poll(() => root.querySelector('[data-card]')).not.toBeNull();
		return {
			root,
			card,
			dismiss: root.querySelector<HTMLElement>('[data-dismiss]')!,
			restore: root.querySelector<HTMLButtonElement>('[data-restore]')!,
		};
	};

	test('follows the drag, springs back when short or diagonal, and is dismissed by a long drag, a flick or the button', async () => {
		const { root, card, dismiss, restore } = await mount();
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

	test('a swipe while the Dismiss button has focus moves focus to the restore button', async () => {
		const { card, dismiss, restore } = await mount();

		dismiss.focus();
		expect(document.activeElement).toBe(dismiss);
		pointer(card, 'pointerdown', 200, 0, 1000);
		pointer(card, 'pointerup', 20, 0, 1500);
		await expect.poll(() => card.hidden).toBe(true);

		expect(document.activeElement).toBe(restore);
	});

	test('restoring brings the card back at rest and returns focus to the dismiss button', async () => {
		const { root, card, dismiss, restore } = await mount();

		pointer(card, 'pointerdown', 200, 0, 1000);
		pointer(card, 'pointerup', 20, 0, 1500);
		await expect.poll(() => card.hidden).toBe(true);
		expect(restore.hidden).toBe(false);

		await userEvent.click(restore);
		expect(card.hidden).toBe(false);
		expect(restore.hidden).toBe(true);
		expect(card.style.getPropertyValue('--swipe-dx')).toBe('0px');
		expect(card.style.getPropertyValue('--swipe-opacity')).toBe('1');
		expect(status(root)).toBe('The card is shown');
		expect(document.activeElement).toBe(dismiss);
	});
});

test('swipe card Radiant form removes every listener when the element leaves and starts again on a fresh copy', async () => {
	const tracker = trackListeners();
	let root: HTMLElement;
	try {
		root = await mountForm('swipe-card', 'radiant');
		await expect.poll(() => tracker.live().length).toBeGreaterThan(0);
		root.remove();
		expect(tracker.live()).toEqual([]);
	} finally {
		tracker.stop();
	}

	const fresh = root.cloneNode(true) as HTMLElement;
	document.body.append(fresh);
	const card = fresh.querySelector<HTMLElement>('[data-card]')!;
	pointer(card, 'pointerdown', 200, 0, 1000);
	pointer(card, 'pointermove', 170, 0, 1100);
	expect(card.style.getPropertyValue('--swipe-dx')).toBe('-30px');
	pointer(card, 'pointerup', 20, 0, 1500);
	await expect.poll(() => card.hidden).toBe(true);
	expect(status(fresh)).toBe('Card dismissed, swiped left');
});

describe.each<Form>(['plain', 'radiant'])('popover menu (%s form)', (form) => {
	const mount = async () => {
		const root = await mountForm('popover-menu', form);
		const trigger = root.querySelector<HTMLElement>('button')!;
		const menu = root.querySelector<HTMLElement>('[role="menu"]')!;
		const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')];
		await expect.poll(() => items.map((item) => item.tabIndex)).toEqual([0, -1, -1]);
		return { root, trigger, menu, items };
	};

	test('opens into the menu, walks the items and returns focus to the button', async () => {
		const { root, trigger, menu, items } = await mount();
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

	test('the open menu stays inside the example frame, so it covers nothing after it', async () => {
		const { root, trigger, menu } = await mount();
		let frame = root;
		if (form === 'radiant') {
			frame = document.createElement('div');
			frame.dataset.host = '';
			root.replaceWith(frame);
			frame.append(root);
		}
		frame.classList.add('primitive-example');
		await userEvent.click(trigger);

		await expect
			.poll(() => menu.getBoundingClientRect().bottom)
			.toBeLessThanOrEqual(frame.getBoundingClientRect().bottom);
	});
});

test('popover menu Radiant form removes every listener when the element leaves and starts again on a fresh copy', async () => {
	const tracker = trackListeners();
	let root: HTMLElement;
	try {
		root = await mountForm('popover-menu', 'radiant');
		const trigger = root.querySelector<HTMLElement>('button')!;
		await expect.poll(() => root.querySelector('[role="menuitem"]')!.tabIndex).toBe(0);
		await userEvent.click(trigger);
		expect(tracker.live().length).toBeGreaterThan(0);
		root.remove();
		expect(tracker.live()).toEqual([]);
	} finally {
		tracker.stop();
	}

	const fresh = root.cloneNode(true) as HTMLElement;
	document.body.append(fresh);
	const menu = fresh.querySelector<HTMLElement>('[role="menu"]')!;
	await expect.poll(() => fresh.querySelector('[role="menuitem"]')!.tabIndex).toBe(0);
	menu.hidden = true;
	await userEvent.click(fresh.querySelector('button')!);
	expect(menu.hidden).toBe(false);
	await userEvent.keyboard('{Enter}');
	expect(status(fresh)).toBe('Chose Rename');
});
