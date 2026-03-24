import type { ReactivePropertyOptions } from '../core/radiant-element';
import { reactiveProp } from './reactive-prop';

/**
 * Semantic alias for `@reactiveProp(...)`.
 *
 * `@prop(...)` reads closer to the public component model while preserving the
 * same reactive behavior and reflection rules.
 *
 * When no explicit `bind` option is provided, `RadiantComponent` hosts expose
 * a JSX companion binding accessor automatically while plain `RadiantElement`
 * hosts keep binding opt-in.
 */
export function prop<T = unknown>(options: ReactivePropertyOptions<T>) {
	return reactiveProp(options);
}
