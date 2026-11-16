import { expect, test } from 'vitest';
import { adaptReactiveStateToJsxBinding } from '../../src/core/reactive-binding-adapter';

test('member bindings follow a non-tracking subscribable source', () => {
	let current = { count: 1 };
	const listeners = new Set<(value: typeof current) => void>();
	const binding = adaptReactiveStateToJsxBinding({
		get: () => current,
		subscribe: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	});
	const seen: number[] = [];
	const unsubscribe = binding.count.subscribe((value) => seen.push(value));
	current = { count: 2 };
	for (const listener of listeners) listener(current);
	expect(binding.count.getValue()).toBe(2);
	expect(seen).toEqual([2]);
	unsubscribe();
	expect(listeners.size).toBe(0);
	current = { count: 3 };
	expect(binding.count.getValue()).toBe(3);
});
