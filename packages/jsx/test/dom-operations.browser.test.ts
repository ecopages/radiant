import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { insertNodesBefore } from '../src/dom-render/dom-operations.ts';
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
