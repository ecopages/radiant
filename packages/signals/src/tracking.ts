import { getActiveDependencyRecorder, setActiveDependencyRecorder } from './runtime';
import type { Signal } from './types';

/**
 * Reads signals without registering their reads as dependencies of the current
 * computed signal or effect.
 *
 * This is the escape hatch for code that needs the latest value without making
 * future writes retrigger the active reactive computation.
 */
export function untrack<Value>(read: () => Value): Value {
	const previousActiveDependencyRecorder = getActiveDependencyRecorder();
	setActiveDependencyRecorder(undefined);

	try {
		return read();
	} finally {
		setActiveDependencyRecorder(previousActiveDependencyRecorder);
	}
}

/**
 * Reads a signal's current value without tracking it as a dependency.
 *
 * This is a convenience wrapper around `untrack(...)` for the common case of a
 * single signal read.
 */
export function peek<Value>(signal: Signal<Value>): Value {
	return untrack(() => signal.get());
}
