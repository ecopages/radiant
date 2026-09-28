export {
	asyncState,
	type AsyncStateConfig,
	type AsyncStateFetcherOptions,
	type AsyncStateResult,
	type AsyncStateSourcedConfig,
	type AsyncStatus,
} from './src/async-state';
export { Computed, computed, currentComputed } from './src/computed';
export { trackDependency } from './src/dependency';
export { effect } from './src/effect';
export { State, state } from './src/state';
export { createStore, isStore, snapshot } from './src/store';
export { peek, untrack } from './src/tracking';
export {
	type DependencyNode,
	type EffectCallback,
	type EffectCleanup,
	type EffectOptions,
	type EffectScheduler,
	type Signal,
	type SignalOptions,
	type SignalStore,
	type SignalSubscriber,
	type WatchOptions,
	type WritableSignal,
	watched,
	unwatched,
} from './src/types';
export { Watcher } from './src/watcher';
export { watch } from './src/watch';

import { currentComputed } from './src/computed';
import { trackDependency } from './src/dependency';
import { untrack } from './src/tracking';
import { watched, unwatched } from './src/types';
import { Watcher } from './src/watcher';

/**
 * Proposal-shaped low-level APIs for framework and adapter authors.
 *
 * This groups the lower-level pieces that mirror the TC39 proposal naming
 * without forcing application code onto the subtle surface by default.
 */
export const subtle = Object.freeze({
	Watcher,
	currentComputed,
	trackDependency,
	untrack,
	watched,
	unwatched,
});
