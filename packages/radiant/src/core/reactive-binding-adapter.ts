import { mapSubscribable, type JsxRenderable, type SignalLike, type SubscribableJsxValue } from '@ecopages/jsx';
import type { ReactiveState } from './reactivity-contract';

/**
 * Adapts a host member {@link ReactiveState} into the jsx binding shape.
 *
 * Kept in a dedicated module so `reactive-host.ts` stays free of direct
 * `@ecopages/jsx` imports while bindings still expose `getValue`, `subscribe`,
 * and `map` for derived child updates.
 */
export function adaptReactiveStateToJsxBinding<Value extends JsxRenderable>(
	state: ReactiveState<Value>,
): SubscribableJsxValue<Value> {
	return mapSubscribable(state as SignalLike<Value>, (value) => value);
}
