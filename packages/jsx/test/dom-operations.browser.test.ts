import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { clearRangeBetween, insertNodesBefore } from '../src/dom-render/dom-operations.ts';
import { jsx, jsxs } from '../src/jsx-runtime.ts';
import { createRoot } from '../src/index.ts';
import {
	installDefaultDevWarningFormatter,
	resetRuntimeWarningsForTests,
	setDevWarningsEnabled,
} from '../src/warnings/jsx-dev-warnings.ts';

beforeEach(() => {
	// Normally installed by `jsx-dev-runtime`; without it `warnRuntime` has no formatter.
	installDefaultDevWarningFormatter();
	setDevWarningsEnabled(true);
	resetRuntimeWarningsForTests();
});

afterEach(() => {
	resetRuntimeWarningsForTests();
	setDevWarningsEnabled(undefined);
});

describe('insertNodesBefore', () => {
	test('inserts nodes before the reference node', () => {
		const parent = document.createElement('div');
		const reference = document.createElement('span');
		parent.append(reference);

		const first = document.createElement('b');
		const second = document.createElement('i');
		insertNodesBefore(reference, [first, second]);

		expect(Array.from(parent.children)).toEqual([first, second, reference]);
	});

	test('no-ops on an empty node list', () => {
		const parent = document.createElement('div');
		const reference = document.createElement('span');
		parent.append(reference);

		insertNodesBefore(reference, []);

		expect(parent.children).toHaveLength(1);
	});

	/**
	 * A stale range can hand back a node that already contains the anchor. The DOM answers
	 * that with a HierarchyRequestError, which escapes hydration as an uncaught exception —
	 * so this degrades to the drift warning instead, letting the caller fall back.
	 */
	test('warns instead of throwing when a node contains the reference node', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const ancestor = document.createElement('div');
		const reference = document.createElement('span');
		ancestor.append(reference);
		document.body.append(ancestor);

		expect(() => insertNodesBefore(reference, [ancestor])).not.toThrow();
		expect(warn).toHaveBeenCalledOnce();
		expect(ancestor.contains(reference)).toBe(true);

		ancestor.remove();
		warn.mockRestore();
	});

	test('rejects the whole batch when any node contains the reference node', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const ancestor = document.createElement('div');
		const reference = document.createElement('span');
		ancestor.append(reference);
		document.body.append(ancestor);
		const safe = document.createElement('b');

		insertNodesBefore(reference, [safe, ancestor]);

		expect(safe.parentNode).toBeNull();
		expect(Array.from(ancestor.children)).toEqual([reference]);

		ancestor.remove();
		warn.mockRestore();
	});
});

describe('clearRangeBetween', () => {
	test('removes the nodes between the markers and keeps the markers', () => {
		const parent = document.createElement('div');
		const start = document.createTextNode('');
		const end = document.createTextNode('');
		parent.append(document.createElement('header'), start, 'a', document.createElement('b'), end, 'tail');

		clearRangeBetween(start, end);

		expect([...parent.childNodes].map((node) => node.nodeName)).toEqual(['HEADER', '#text', '#text', '#text']);
		expect(start.nextSibling).toBe(end);
		expect(end.nextSibling?.textContent).toBe('tail');
	});

	test('removes nothing when the end marker comes before the start marker', () => {
		const parent = document.createElement('div');
		const start = document.createTextNode('');
		const end = document.createTextNode('');
		parent.append(end, document.createElement('b'), start, document.createElement('i'), 'tail');

		clearRangeBetween(start, end);

		expect(parent.childNodes).toHaveLength(5);
	});

	test('renders, replaces and clears a keyed list without creating a DOM Range', () => {
		const createRange = vi.spyOn(document, 'createRange');
		const container = document.createElement('div');
		document.body.append(container);
		const root = createRoot(container);
		let nextId = 1;
		const view = (count: number) =>
			jsx('table', {
				children: jsx('tbody', {
					children: Array.from({ length: count }, () => {
						const id = nextId++;
						return jsxs('tr', {
							key: id,
							children: [jsx('td', { children: id }), jsx('td', { children: `row ${id}` })],
						});
					}),
				}),
			});

		try {
			root.render(view(200));
			root.render(view(200));
			expect(container.querySelectorAll('tr')).toHaveLength(200);
			root.render(view(0));
			expect(container.querySelectorAll('tr')).toHaveLength(0);
			expect(createRange).not.toHaveBeenCalled();
		} finally {
			root.unmount();
			container.remove();
			createRange.mockRestore();
		}
	});
});
