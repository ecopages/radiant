import type { ReactivePropertyOptions } from '../core/radiant-element';
import { reactiveProp } from './reactive-prop';

/**
 * JSX-first reactive property decorator.
 *
 * This keeps the same reactive property semantics as `@reactiveProp(...)`, but
 * enables a bound JSX companion accessor by default so JSX child updates can be
 * patched directly.
 */
export function jsxProp<T = unknown>(options: ReactivePropertyOptions<T>) {
	return reactiveProp({
		...options,
		bind: options.bind ?? true,
	});
}
