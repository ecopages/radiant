import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/modal.css';
import { mountForm, trackListeners, type Form } from './mount-recipe';

const status = (root: HTMLElement) => root.querySelector('[data-status]')!.textContent;

afterEach(() => {
	document.body.innerHTML = '';
	document.documentElement.removeAttribute('style');
});

describe.each<Form>(['plain', 'radiant'])('modal, %s form', (form) => {
	test('traps focus, locks scroll, closes three ways and returns focus to the opener', async () => {
		const root = await mountForm('modal', form);
		const opener = root.querySelector<HTMLElement>('[data-open]')!;
		const layer = root.querySelector<HTMLElement>('[data-layer]')!;
		const dialog = root.querySelector<HTMLElement>('[data-dialog]')!;
		const origin = layer.parentElement!;
		const [cancel, confirm] = dialog.querySelectorAll<HTMLElement>('button');

		await userEvent.click(opener);
		expect(layer.hidden).toBe(false);
		expect(layer.parentElement).toBe(root);
		expect(document.documentElement.style.overflow).toBe('hidden');
		await expect.poll(() => document.activeElement).toBe(cancel);

		await userEvent.tab();
		expect(document.activeElement).toBe(confirm);
		await userEvent.tab();
		expect(document.activeElement).toBe(cancel);

		await userEvent.keyboard('{Escape}');
		expect(layer.hidden).toBe(true);
		expect(layer.parentElement).toBe(origin);
		expect(document.documentElement.style.overflow).toBe('');
		expect(document.activeElement).toBe(opener);

		await userEvent.click(opener);
		await userEvent.click(cancel);
		expect(layer.hidden).toBe(true);
		expect(document.activeElement).toBe(opener);

		await userEvent.click(opener);
		layer.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1 }));
		expect(layer.hidden).toBe(true);
		expect(document.activeElement).toBe(opener);

		await userEvent.click(opener);
		await userEvent.click(confirm);
		expect(layer.hidden).toBe(true);
		expect(status(root)).toBe('Deleted');
		expect(document.activeElement).toBe(root.querySelector('[data-next]'));

		await userEvent.click(opener);
		await userEvent.keyboard('{Escape}');
		expect(document.activeElement).toBe(opener);
	});

	test('locks the docs article column and not the page when the example sits in one', async () => {
		const root = await mountForm('modal', form);
		const column = document.createElement('div');
		column.className = 'docs-layout__content';
		root.replaceWith(column);
		column.append(root);

		await userEvent.click(root.querySelector<HTMLElement>('[data-open]')!);
		expect(column.style.overflow).toBe('hidden');
		expect(document.documentElement.style.overflow).toBe('');

		await userEvent.keyboard('{Escape}');
		expect(column.style.overflow).toBe('');
	});

	test('covers the example frame with a backdrop and a panel inside it', async () => {
		const root = await mountForm('modal', form);
		const frame = form === 'plain' ? root : document.createElement('div');
		if (form === 'plain') {
			frame.classList.add('primitive-example');
		} else {
			frame.className = 'primitive-example';
			frame.dataset.host = '';
			root.replaceWith(frame);
			frame.append(root);
		}
		const layer = root.querySelector<HTMLElement>('[data-layer]')!;
		const dialog = root.querySelector<HTMLElement>('[data-dialog]')!;

		await userEvent.click(root.querySelector<HTMLElement>('[data-open]')!);

		expect(getComputedStyle(layer).position).toBe('absolute');
		const area = layer.getBoundingClientRect();
		const frameArea = frame.getBoundingClientRect();
		expect([area.x, area.y, area.width, area.height]).toEqual([
			frameArea.x,
			frameArea.y,
			frameArea.width,
			frameArea.height,
		]);
		expect(dialog.getBoundingClientRect().width).toBeLessThanOrEqual(area.width);
	});
});

test('modal Radiant form releases the scroll lock and the document listeners when the element leaves while open', async () => {
	const tracker = trackListeners();
	let root: HTMLElement;
	try {
		root = await mountForm('modal', 'radiant');
		const before = tracker.live(document);
		await userEvent.click(root.querySelector<HTMLElement>('[data-open]')!);
		expect(document.documentElement.style.overflow).toBe('hidden');
		expect(tracker.live(document).length).toBeGreaterThan(before.length);

		root.remove();
		expect(tracker.live(document)).toEqual(before);
		expect(document.documentElement.style.overflow).toBe('');
	} finally {
		tracker.stop();
	}

	const fresh = root.cloneNode(true) as HTMLElement;
	document.body.append(fresh);
	await expect.poll(() => fresh.querySelector<HTMLElement>('[data-layer]')!.hidden).toBe(true);
	await userEvent.click(fresh.querySelector<HTMLElement>('[data-open]')!);
	expect(fresh.querySelector<HTMLElement>('[data-layer]')!.hidden).toBe(false);
	await userEvent.keyboard('{Escape}');
	expect(status(fresh)).toBe('Dialog closed');
});
