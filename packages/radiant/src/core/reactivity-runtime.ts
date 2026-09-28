import type { ReactiveRuntime } from './reactivity-contract';
import { signalsReactiveRuntime } from './reactivity-signals';

let activeReactiveRuntime: ReactiveRuntime = signalsReactiveRuntime;

/**
 * Returns the currently active internal reactivity runtime.
 *
 * The current implementation still defaults to the Signals-backed runtime, so
 * importing this module preserves today's behavior. A stricter optional-runtime
 * architecture would move that default installation into an explicit bootstrap
 * step instead of this eager default.
 */
export function getReactiveRuntime(): ReactiveRuntime {
	return activeReactiveRuntime;
}

/**
 * Replaces the active internal reactivity runtime used by Radiant core.
 *
 * This is an internal seam for alternate runtime experiments and tests. It does
 * not yet make Signals optional at module-load time because this module still
 * imports the default Signals-backed runtime eagerly.
 */
export function setReactiveRuntime(runtime: ReactiveRuntime): void {
	activeReactiveRuntime = runtime;
}
