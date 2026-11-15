import { afterEach, describe, expect, test } from 'vitest';

const pages = import.meta.glob('../src/content/components/controllers/*.mdx', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>;
const scripts = import.meta.glob('../src/content/components/controllers/*.script.ts');

const markup = (slug: string) =>
	pages[`../src/content/components/controllers/${slug}.mdx`]!.match(/```html\n([\s\S]*?)\n```/)![1];

/** Loads the page script, which mounts the example already in the document, the way the browser does on first load. */
async function load(slug: string): Promise<HTMLElement> {
	document.body.innerHTML = markup(slug);
	await scripts[`../src/content/components/controllers/${slug}.script.ts`]!();
	return document.querySelector<HTMLElement>(`[data-example="${slug}"]`)!;
}

/** What the router does to an example: new elements replace the old ones, and the page announces the swap. */
function swapExample(slug: string, event: 'eco:page-load' | 'eco:after-swap'): HTMLElement {
	document.body.innerHTML = markup(slug);
	document.dispatchEvent(new CustomEvent(event));
	return document.querySelector<HTMLElement>(`[data-example="${slug}"]`)!;
}

function press(target: Element, type: string, x: number): void {
	target.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, clientX: x, clientY: 0 }));
}

afterEach(() => {
	document.body.innerHTML = '';
	document.dispatchEvent(new CustomEvent('eco:after-swap'));
});

describe('mountExample after the router swaps the page', () => {
	test.each(['eco:page-load', 'eco:after-swap'] as const)(
		'%s mounts the fresh copy of a swipe example',
		async (event) => {
			await load('swipe');

			const root = swapExample('swipe', event);
			const box = root.querySelector('[data-box]')!;
			press(box, 'pointerdown', 100);
			press(box, 'pointerup', 20);

			expect(root.querySelector('[data-status]')!.textContent).toBe('Swiped left');
		},
	);

	test('the fresh copy of a drag example follows the pointer', async () => {
		await load('pointer-drag');

		const root = swapExample('pointer-drag', 'eco:after-swap');
		const handle = root.querySelector<HTMLElement>('[data-box]')!;
		press(handle, 'pointerdown', 10);
		press(handle, 'pointermove', 40);

		expect(handle.style.transform).toBe('translate(30px, 0px)');
	});

	test('the fresh copy of a popover example opens, and mounting twice does not wire it twice', async () => {
		await load('popover');

		const root = swapExample('popover', 'eco:after-swap');
		document.dispatchEvent(new CustomEvent('eco:page-load'));
		root.querySelector('button')!.click();

		expect(root.querySelector<HTMLElement>('[data-box]')!.hidden).toBe(false);
	});

	test('the controller of the copy that left the page stops listening on the document', async () => {
		const removed = await load('event-listener');

		const root = swapExample('event-listener', 'eco:after-swap');
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));

		expect(removed.querySelector('[data-status]')!.textContent).not.toContain('Pressed');
		expect(root.querySelector('[data-status]')!.textContent).toBe('Pressed a');
	});

	test('an element the router morphs into another example is mounted again under its new name', async () => {
		const root = await load('swipe');
		document.dispatchEvent(new CustomEvent('eco:after-swap'));
		await scripts['../src/content/components/controllers/pointer-drag.script.ts']!();

		root.innerHTML = markup('pointer-drag').match(/<div data-example="pointer-drag">([\s\S]*)<\/div>$/)![1]!;
		root.dataset.example = 'pointer-drag';
		document.dispatchEvent(new CustomEvent('eco:after-swap'));
		const handle = root.querySelector<HTMLElement>('[data-box]')!;
		press(handle, 'pointerdown', 10);
		press(handle, 'pointermove', 40);

		expect(handle.style.transform).toBe('translate(30px, 0px)');
	});

	test('the dismiss controller of the copy that left the page does not report an outside press', async () => {
		const removed = await load('dismiss');
		const removedStatus = removed.querySelector('[data-status]')!;
		const before = removedStatus.textContent;

		swapExample('dismiss', 'eco:after-swap');
		press(document.body, 'pointerdown', 0);

		expect(removedStatus.textContent).toBe(before);
	});
});
