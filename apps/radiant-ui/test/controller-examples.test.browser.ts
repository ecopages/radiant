import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';

const pages = import.meta.glob('../src/content/components/controllers/*.mdx', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>;
const scripts = import.meta.glob('../src/content/components/controllers/*.script.ts');

/**
 * Mounts the markup a controller page documents and runs the script it documents, so the page and the example
 * cannot drift apart.
 */
async function mountExample(slug: string): Promise<HTMLElement> {
	const page = pages[`../src/content/components/controllers/${slug}.mdx`]!;
	const markup = page.match(/```html\n([\s\S]*?)\n```/)![1];
	document.body.innerHTML = markup;
	await scripts[`../src/content/components/controllers/${slug}.script.ts`]!();
	return document.querySelector<HTMLElement>(`[data-example="${slug}"]`)!;
}

function press(target: Element, type: string, x: number, y = 0): void {
	target.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, clientX: x, clientY: y }));
}

const status = (root: HTMLElement) => root.querySelector('[data-status]')!;

afterEach(() => {
	document.body.innerHTML = '';
	document.documentElement.removeAttribute('style');
});

describe('controller page examples', () => {
	test('bindController attaches on connect and destroys on cleanup', async () => {
		const root = await mountExample('bind-controller');
		const [connect, disconnect] = root.querySelectorAll('button');

		connect.click();
		expect(status(root).textContent).toBe('Attached');
		disconnect.click();
		expect(status(root).textContent).toBe('Destroyed');
	});

	test('EventListenerController hears the document until destroyed', async () => {
		const root = await mountExample('event-listener');

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
		expect(status(root).textContent).toBe('Pressed a');

		root.querySelector('button')!.click();
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
		expect(status(root).textContent).toBe('Pressed a');
	});

	test('MutationController reports a child added to the list', async () => {
		const root = await mountExample('mutation');

		root.querySelector('button')!.click();

		await expect.poll(() => status(root).textContent).toBe('2 items');
	});

	test('ResizeController reports the new width of the box', async () => {
		const root = await mountExample('resize');
		await expect.poll(() => status(root).textContent).toMatch(/^Width \d+px$/);
		const before = status(root).textContent;

		root.querySelector('button')!.click();

		await expect.poll(() => status(root).textContent).not.toBe(before);
	});

	test('DismissController hides the panel on an outside press and Escape, not on an inside press', async () => {
		const root = await mountExample('dismiss');
		const panel = root.querySelector<HTMLElement>('[data-box]')!;

		press(panel, 'pointerdown', 0);
		expect(panel.hidden).toBe(false);

		press(document.body, 'pointerdown', 0);
		expect(panel.hidden).toBe(true);
		expect(status(root).textContent).toBe('Dismissed by pointer');

		root.querySelector('button')!.click();
		expect(panel.hidden).toBe(false);
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		expect(status(root).textContent).toBe('Dismissed by escape');
	});

	test('PopoverController shows the panel beside the button and hides it on Escape', async () => {
		const root = await mountExample('popover');
		const panel = root.querySelector<HTMLElement>('[data-box]')!;
		expect(panel.hidden).toBe(true);

		root.querySelector('button')!.click();
		expect(panel.hidden).toBe(false);
		expect(panel.style.position).toBe('fixed');

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		expect(panel.hidden).toBe(true);
	});

	test('PortalController moves the node to body and back', async () => {
		const root = await mountExample('portal');
		const panel = root.querySelector('[data-box]')!;
		const button = root.querySelector('button')!;

		button.click();
		expect(panel.parentElement).toBe(document.body);

		button.click();
		expect(panel.parentElement).toBe(root);
	});

	test('FocusTrapController loops Tab inside the panel and returns focus on release', async () => {
		const root = await mountExample('focus-trap');
		const toggle = root.querySelector<HTMLElement>('[data-toggle]')!;
		const [first, last] = root.querySelectorAll<HTMLElement>('[data-box] button');

		await userEvent.click(toggle);
		await expect.poll(() => document.activeElement).toBe(first);

		last.focus();
		await userEvent.tab();
		expect(document.activeElement).toBe(first);

		await userEvent.click(toggle);
		expect(document.activeElement).toBe(toggle);
	});

	test('ScrollLockController locks the list it is given and restores it', async () => {
		const root = await mountExample('scroll-lock');
		const button = root.querySelector('button')!;
		const scroller = root.querySelector<HTMLElement>('[data-scroller]')!;

		button.click();
		expect(scroller.style.overflow).toBe('hidden');
		expect(document.documentElement.style.overflow).toBe('');

		button.click();
		expect(scroller.style.overflow).toBe('');
	});

	test('RovingController keeps one tab stop and moves it with the arrows', async () => {
		const root = await mountExample('roving');
		const items = [...root.querySelectorAll('button')];
		expect(items.map((item) => item.tabIndex)).toEqual([0, -1, -1]);

		items[0].focus();
		await userEvent.keyboard('{ArrowRight}');
		expect(document.activeElement).toBe(items[1]);
		expect(items.map((item) => item.tabIndex)).toEqual([-1, 0, -1]);

		await userEvent.keyboard('{End}');
		expect(document.activeElement).toBe(items[2]);
	});

	test('SwipeController reports a swipe past the threshold and ignores a short move', async () => {
		const root = await mountExample('swipe');
		const box = root.querySelector('[data-box]')!;

		press(box, 'pointerdown', 20);
		press(box, 'pointerup', 30);
		expect(status(root).textContent).toBe('No swipe yet');

		press(box, 'pointerdown', 100);
		press(box, 'pointerup', 20);
		expect(status(root).textContent).toBe('Swiped left');
	});

	test('PointerDragController follows the pointer and reports how the drag ended', async () => {
		const root = await mountExample('pointer-drag');
		const handle = root.querySelector<HTMLElement>('[data-box]')!;

		press(handle, 'pointerdown', 10, 10);
		press(handle, 'pointermove', 40, 25);
		expect(status(root).textContent).toBe('Moved 30, 15');
		expect(handle.style.transform).toBe('translate(30px, 15px)');

		press(handle, 'pointerup', 40, 25);
		expect(status(root).textContent).toBe('Ended: release');
		expect(handle.style.transform).toBe('');
	});

	test('SortableController reorders by keyboard and announces it', async () => {
		const root = await mountExample('sortable');
		const names = () => [...root.querySelectorAll('li')].map((item) => item.textContent);
		const [plan] = root.querySelectorAll('li');

		plan.focus();
		await userEvent.keyboard(' ');
		await userEvent.keyboard('{ArrowDown}');
		await userEvent.keyboard(' ');

		expect(names()).toEqual(['Build', 'Plan', 'Ship']);
		expect(status(root).textContent).not.toContain('Focus an item');
	});

	test('ListboxPopoverController opens on ArrowDown, moves the active option and picks it with Enter', async () => {
		const root = await mountExample('listbox-popover');
		const input = root.querySelector('input')!;
		const listbox = root.querySelector<HTMLElement>('[role="listbox"]')!;

		input.focus();
		await userEvent.keyboard('{ArrowDown}');
		expect(listbox.hidden).toBe(false);

		await userEvent.keyboard('{ArrowDown}{ArrowDown}');
		expect(input.getAttribute('aria-activedescendant')).toBe(listbox.children[1].id);

		await userEvent.keyboard('{Enter}');
		expect(input.value).toBe('Banana');
		expect(listbox.hidden).toBe(true);
	});

	test('MenuTreeController opens a submenu on click and reports a leaf item', async () => {
		const root = await mountExample('menu-tree');
		const [, recent, submenu] = root.querySelector('[role="menu"]')!.children as unknown as HTMLElement[];
		expect(submenu.hidden).toBe(true);

		recent.click();
		expect(recent.getAttribute('aria-expanded')).toBe('true');
		expect(submenu.hidden).toBe(false);

		(submenu.firstElementChild as HTMLElement).click();
		expect(status(root).textContent).toBe('Chose Report.md');
	});

	test('CalendarPopoverController opens on a day and returns focus to the toggle on Escape', async () => {
		const root = await mountExample('calendar-popover');
		const toggle = root.querySelector('button')!;
		const popup = root.querySelector<HTMLElement>('[data-box]')!;

		await userEvent.click(toggle);
		await expect.poll(() => document.activeElement).toBe(popup.querySelector('[data-calendar-day]'));
		expect(popup.hidden).toBe(false);

		await userEvent.keyboard('{Escape}');
		await expect.poll(() => popup.hidden).toBe(true);
		expect(document.activeElement).toBe(toggle);
	});
});
