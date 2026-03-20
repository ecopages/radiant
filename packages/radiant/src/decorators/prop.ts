import type { ReactivePropertyOptions } from '../core/radiant-element';
import { reactiveProp } from './reactive-prop';

/**
 * Semantic alias for `@reactiveProp(...)`.
 *
 * `@prop(...)` reads closer to the public component model while preserving the
 * same reactive behavior, reflection rules, and optional JSX binding companion
 * accessors.
 */
export function prop<T = unknown>(options: ReactivePropertyOptions<T>) {
	return reactiveProp(options);
}
