export { Computed, computed, currentComputed } from './src/computed';
export { effect } from './src/effect';
export { State, state } from './src/state';
export { createStore, isStore, snapshot } from './src/store';
export { peek, untrack } from './src/tracking';
export {
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
	untrack,
	watched,
	unwatched,
});
