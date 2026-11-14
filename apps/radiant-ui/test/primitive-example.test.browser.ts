import { afterEach, describe, expect, test } from 'vitest';
import { syncExamples } from '../src/components/primitive-example/mount-example';
import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';

const pages = import.meta.glob('../src/content/components/{controllers,recipes}/*.mdx', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>;
const scripts = import.meta.glob('../src/content/components/{controllers,recipes}/*.script.ts');

/**
 * Mounts a page's example inside the frame class the `PrimitiveExample` component renders, followed by the kind of
 * positioned block a code fence is, tall enough for a popup to overlap it.
 */
async function mountFramed(section: 'controllers' | 'recipes', slug: string): Promise<HTMLElement> {
	const markup = pages[`../src/content/components/${section}/${slug}.mdx`]!.match(/```html\n([\s\S]*?)\n```/)![1];
	document.body.innerHTML = `${markup}<pre style="position: relative; height: 20rem">code</pre>`;
	const root = document.querySelector<HTMLElement>(`[data-example="${slug}"]`)!;
	root.classList.add('primitive-example', 'unstyled');
	await scripts[`../src/content/components/${section}/${slug}.script.ts`]!();
	syncExamples();
	return root;
}

function centerOf(element: Element): { x: number; y: number } {
	const { left, top, width, height } = element.getBoundingClientRect();
	return { x: left + width / 2, y: top + height / 2 };
}

function expectOnTop(popup: Element): void {
	const { x, y } = centerOf(popup);
	expect(popup.contains(document.elementFromPoint(x, y))).toBe(true);
}

afterEach(() => {
	document.body.innerHTML = '';
	syncExamples();
});

describe('example frame layout', () => {
	test('a menu lists its items in a column and opens the submenu beside its item', async () => {
		const root = await mountFramed('controllers', 'menu-tree');
		const [newItem, recent, submenu] = root.querySelector('[role="menu"]')!.children as unknown as HTMLElement[];

		expect(recent.getBoundingClientRect().top).toBeGreaterThan(newItem.getBoundingClientRect().top);
		expect(recent.getBoundingClientRect().left).toBe(newItem.getBoundingClientRect().left);
		expect(recent.getBoundingClientRect().width).toBe(newItem.getBoundingClientRect().width);

		recent.click();

		const item = recent.getBoundingClientRect();
		const opened = submenu.getBoundingClientRect();
		expect(opened.left >= item.right || opened.top >= item.bottom).toBe(true);
		expectOnTop(submenu);
	});
});

describe('example frame stacking', () => {
	test('the popover panel sits above the code block that follows', async () => {
		const root = await mountFramed('controllers', 'popover');

		root.querySelector('button')!.click();

		expectOnTop(root.querySelector('[data-box]')!);
	});

	test('the popover menu recipe lists its items in a column above the code block that follows', async () => {
		const root = await mountFramed('recipes', 'popover-menu');

		root.querySelector('button')!.click();

		const [first, second] = root.querySelectorAll('[role="menuitem"]');
		expect(second.getBoundingClientRect().top).toBeGreaterThan(first.getBoundingClientRect().top);
		expect(second.getBoundingClientRect().left).toBe(first.getBoundingClientRect().left);
		expectOnTop(root.querySelector('[role="menu"]')!);
	});
});

describe('example frame touch dragging', () => {
	test('the sortable controller example items do not scroll the page or select text under a drag', async () => {
		const root = await mountFramed('controllers', 'sortable');

		const item = getComputedStyle(root.querySelector('li')!);
		expect(item.touchAction).toBe('none');
		expect(item.userSelect).toBe('none');
	});

	test('the sortable controller example shows the lifted item in the accent colors and moved by the drag offsets', async () => {
		const root = await mountFramed('controllers', 'sortable');
		const item = root.querySelector<HTMLElement>('li')!;
		const rest = getComputedStyle(root.querySelectorAll('li')[1]);

		item.dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1, clientX: 5, clientY: 5 }),
		);
		document.dispatchEvent(
			new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 45, clientY: 30 }),
		);

		const lifted = getComputedStyle(item);
		expect(item.dataset.sortableState).toBe('lifted');
		expect(lifted.backgroundColor).not.toBe(rest.backgroundColor);
		expect(lifted.transform).not.toBe('none');
		document.dispatchEvent(
			new PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: 45, clientY: 30 }),
		);
	});
});
