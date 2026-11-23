import { afterEach, describe, expect, test } from 'vitest';
import { createFrame } from './mount-recipe';
import { exampleFrameOptions } from '../src/components/recipe-patterns/example-frame';
import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';

import.meta.glob('../src/content/components/recipes/*.css', { eager: true });
const plain = import.meta.glob('../src/content/components/recipes/*.plain.html', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>;
const element = import.meta.glob('../src/content/components/recipes/*.element.html', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>;

const slugOf = (path: string) => path.match(/recipes\/(.+)\.plain\.html$/)![1]!;
const slugs = Object.keys(plain).map(slugOf);
const file = (files: Record<string, string>, slug: string, pattern: 'plain' | 'element') =>
	files[`../src/content/components/recipes/${slug}.${pattern}.html`];

/** The recipes whose stylesheet gives the root a card box of its own, so the root must be laid out, not transparent. */
const CARDS = ['agent-tools', 'searchable-list'];

const FRAME = [
	'display',
	'flex-direction',
	'flex-wrap',
	'align-items',
	'align-content',
	'gap',
	'padding-top',
	'border-top-width',
	'background-color',
	'min-height',
	'width',
	'overflow-x',
	'box-shadow',
];
const ROOT = ['display', 'padding-top', 'border-top-width', 'background-color', 'box-shadow', 'width'];
const PARTS = ['[data-status]', 'form', 'input', 'button', 'ul', 'li'];
const PART_STYLES = ['display', 'border-top-width', 'background-color', 'padding-top', 'border-radius'];

function read(element: Element, properties: string[]): Record<string, string> {
	const computed = getComputedStyle(element);
	return Object.fromEntries(properties.map((property) => [property, computed.getPropertyValue(property)]));
}

/** The frame a page renders for a pattern's file, with what a reader sees of it laid out. */
function measure(markup: string) {
	const frame = createFrame(exampleFrameOptions(), markup);
	document.body.append(frame);
	const root = frame.firstElementChild!;
	const parts = Object.fromEntries(
		PARTS.map((selector) => [selector, root.querySelector(selector)]).filter(([, part]) => part !== null),
	) as Record<string, Element>;
	return {
		frame: read(frame, FRAME),
		frameRect: frame.getBoundingClientRect(),
		root: read(root, ROOT),
		rootRect: root.getBoundingClientRect(),
		parts: Object.fromEntries(Object.entries(parts).map(([selector, part]) => [selector, read(part, PART_STYLES)])),
	};
}

afterEach(() => {
	document.body.innerHTML = '';
});

describe('recipe example frames', () => {
	describe.each(slugs)('%s', (slug) => {
		test('the plain example frame and its root are laid out', () => {
			const { frame, frameRect, root, rootRect } = measure(file(plain, slug, 'plain')!);

			expect(frameRect.width).toBeGreaterThan(0);
			expect(frameRect.height).toBeGreaterThan(0);
			if (CARDS.includes(slug)) {
				expect(root.display).not.toBe('contents');
				expect(rootRect.width).toBeGreaterThan(0);
				expect(rootRect.height).toBeGreaterThan(0);
				expect(root['border-top-width']).toBe('1px');
			} else {
				expect(root.display).toBe('contents');
			}
			expect(frame.display).not.toBe('contents');
		});

		test('the plain example looks like the element example', () => {
			const markup = file(element, slug, 'element');
			if (markup === undefined) {
				return;
			}
			const expected = measure(markup);
			if (CARDS.includes(slug)) {
				expect(expected.root.display).not.toBe('contents');
				expect(expected.rootRect.width).toBeGreaterThan(0);
			}
			document.body.innerHTML = '';
			const actual = measure(file(plain, slug, 'plain')!);

			expect(actual.frame).toEqual(expected.frame);
			expect(actual.root).toEqual(expected.root);
			expect(actual.rootRect.width).toBe(expected.rootRect.width);
			expect(actual.rootRect.height).toBe(expected.rootRect.height);
			expect(actual.frameRect.height).toBe(expected.frameRect.height);
			for (const selector of Object.keys(expected.parts).filter(
				(part) => part !== '[data-example] > :first-child',
			)) {
				expect(actual.parts[selector], selector).toEqual(expected.parts[selector]);
			}
		});
	});

	test('the agent tools card has one border on each product and none on the list', () => {
		const frame = createFrame(exampleFrameOptions(), file(plain, 'agent-tools', 'plain')!);
		document.body.append(frame);
		const list = frame.querySelector('ul')!;

		expect(getComputedStyle(list, '::before').content).toContain('Nothing in the cart yet');
		const item = list.appendChild(document.createElement('li'));
		item.textContent = 'apple';
		expect(getComputedStyle(list).borderTopWidth).toBe('0px');
		expect(getComputedStyle(item).borderTopWidth).toBe('1px');
	});
});
