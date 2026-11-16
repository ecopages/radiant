import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { syncExamples } from '../src/components/primitive-example/mount-example';

const pages = import.meta.glob('../src/content/components/controllers/*.mdx', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>;
const scripts = import.meta.glob('../src/content/components/controllers/*.script.ts');

/**
 * Mounts the markup a controller page documents and runs the script it documents, so the page and the example
 * cannot drift apart. A script module runs once, so `syncExamples` mounts the fresh markup of later tests.
 */
async function mountExample(slug: string): Promise<HTMLElement> {
	const page = pages[`../src/content/components/controllers/${slug}.mdx`]!;
	const markup = page.match(/```html\n([\s\S]*?)\n```/)![1];
	document.body.innerHTML = markup;
	await scripts[`../src/content/components/controllers/${slug}.script.ts`]!();
	syncExamples();
	return document.querySelector<HTMLElement>(`[data-example="${slug}"]`)!;
}

function press(target: Element, type: string, x: number, y = 0, timeStamp?: number): void {
	const event = new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, clientX: x, clientY: y });
	if (timeStamp !== undefined) {
		Object.defineProperty(event, 'timeStamp', { value: timeStamp });
	}
	target.dispatchEvent(event);
}

const status = (root: HTMLElement) => root.querySelector('[data-status]')!;

afterEach(() => {
	vi.restoreAllMocks();
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

	test('AudioVisualizerController writes levels while the tone plays and removes them on pause', async () => {
		const root = await mountExample('audio-visualizer');
		const bar = root.querySelector<HTMLElement>('[data-visual] span')!;
		const play = root.querySelector<HTMLElement>('[data-play]')!;

		await userEvent.click(play);
		await expect.poll(() => bar.style.getPropertyValue('--level')).not.toBe('');

		await userEvent.click(play);
		await expect.poll(() => bar.style.getPropertyValue('--level')).toBe('');
	});

	test('AudioVisualizerController swaps to a canvas preset sized to its box', async () => {
		const root = await mountExample('audio-visualizer');
		const visual = root.querySelector<HTMLElement>('[data-visual]')!;

		root.querySelector<HTMLElement>('[data-preset="wave"]')!.click();
		const canvas = visual.querySelector('canvas')!;
		expect(canvas.getAttribute('aria-hidden')).toBe('true');
		expect(canvas.width).toBe(Math.round(canvas.getBoundingClientRect().width * window.devicePixelRatio));

		root.querySelector<HTMLElement>('[data-preset="bars-dom"]')!.click();
		expect(visual.querySelector('canvas')).toBeNull();
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

	test('CaptionsController shows one track at a time and keeps the toggle in step', async () => {
		const root = await mountExample('captions');
		const video = root.querySelector('video')!;
		const toggle = root.querySelector<HTMLButtonElement>('[data-action="captions"]')!;
		const language = root.querySelector<HTMLButtonElement>('[data-action="language"]')!;
		const modes = () => [...video.textTracks].map((track) => track.mode);
		expect(modes()).toEqual(['disabled', 'disabled']);
		expect(toggle.getAttribute('aria-pressed')).toBe('false');

		toggle.click();
		expect(modes()).toEqual(['showing', 'disabled']);
		expect(toggle.getAttribute('aria-pressed')).toBe('true');
		expect(status(root).textContent).toBe('Captions on: en');

		language.click();
		expect(modes()).toEqual(['disabled', 'showing']);
		expect(language.textContent).toBe('Italiano');

		root.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
		expect(modes()).toEqual(['disabled', 'disabled']);
		expect(toggle.getAttribute('aria-pressed')).toBe('false');
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

		press(box, 'pointerdown', 100, 0, 1000);
		press(box, 'pointerup', 130, 0, 1030);
		expect(status(root).textContent).toBe('Swiped right');

		press(box, 'pointerdown', 100, 0, 2000);
		press(box, 'pointerup', 20, 70, 2400);
		expect(status(root).textContent).toBe('Swiped right');
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
		expect(status(root).textContent).toBe('Dropped Plan, position 2 of 3.');
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

	test('MediaController loads a tone, plays it and scrubs', async () => {
		const root = await mountExample('media');
		const play = root.querySelector<HTMLButtonElement>('[data-action="play"]')!;
		const seek = root.querySelector<HTMLInputElement>('input[type="range"]')!;
		await expect.poll(() => status(root).textContent).toMatch(/^ready, 0:00 of 0:04/);
		expect(seek.disabled).toBe(false);

		await userEvent.click(play);
		await expect.poll(() => play.getAttribute('aria-pressed')).toBe('true');
		await expect.poll(() => status(root).textContent).toMatch(/^playing/);

		seek.value = '3';
		seek.dispatchEvent(new Event('input', { bubbles: true }));
		expect(status(root).textContent).toMatch(/0:03 of 0:04/);

		await userEvent.click(play);
		expect(play.getAttribute('aria-pressed')).toBe('false');
		expect(play.textContent).toBe('Play');
		await userEvent.click(root.querySelector('[data-action="mute"]')!);
		await expect.poll(() => root.querySelector('[data-action="mute"]')!.getAttribute('aria-pressed')).toBe('true');
	});

	test('CopyController copies the code, shows the state and announces it', async () => {
		const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
		const root = await mountExample('copy');
		const button = root.querySelector('button')!;

		button.click();

		await vi.waitFor(() => expect(button.getAttribute('data-copy-state')).toBe('copied'));
		expect(writeText).toHaveBeenCalledWith('pnpm add @ecopages/radiant-ui');
		expect(status(root).textContent).toBe('Copied');
	});

	test('HotkeyController runs the matching key, prefers the Shift form and announces it', async () => {
		const root = await mountExample('hotkey');
		const stage = root.querySelector<HTMLElement>('[data-stage]')!;
		const press = (key: string, init: KeyboardEventInit = {}) =>
			stage.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));

		press('ArrowRight');
		expect(status(root).textContent).toBe('Forward 5 s to 5 s');
		press('ArrowLeft', { shiftKey: true });
		expect(status(root).textContent).toBe('Back 1 s to 4 s');
		press('ArrowLeft');
		expect(status(root).textContent).toBe('Back 5 s to 0 s');
		press('k');
		expect(status(root).textContent).toBe('Playing at 0 s');
	});

	test('MediaRecorderController reports a refused microphone as denied and keeps Record usable', async () => {
		vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(new DOMException('no', 'NotAllowedError'));
		const root = await mountExample('media-recorder');
		const record = root.querySelector<HTMLButtonElement>('[data-record]')!;

		record.click();

		await vi.waitFor(() => expect(status(root).textContent).toContain('Microphone access was denied'));
		expect(record.disabled).toBe(false);
	});
});
