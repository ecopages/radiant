import { assertSignalAccessAllowed, trackActiveDependency } from './runtime';
import type { DependencyNode } from './types';

/**
 * Registers a custom dependency node with the currently active computation.
 *
 * This is intended for framework and renderer adapters that need plain reactive
 * sources to participate in `Computed`, `effect(...)`, or watcher dependency
 * discovery without first wrapping those sources in a full signal instance.
 */
export function trackDependency(dependency: DependencyNode): void {
	assertSignalAccessAllowed();
	trackActiveDependency(dependency);
}