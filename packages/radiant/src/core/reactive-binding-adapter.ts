import {
	createSubscribableJsxValue,
	type JsxBindingSourceValue,
	type SubscribableJsxValueWithAccess,
} from '@ecopages/jsx';
import type { ReactiveState } from './reactivity-contract';

/**
 * Adapts a host member {@link ReactiveState} into the jsx binding shape.
 *
 * Kept in a dedicated module so `reactive-host.ts` stays free of direct
 * `@ecopages/jsx` imports while bindings still expose `getValue`, `subscribe`,
 * and `map` for derived child updates.
 */
export function adaptReactiveStateToJsxBinding<Value extends JsxBindingSourceValue>(
	state: ReactiveState<Value>,
): SubscribableJsxValueWithAccess<Value> {
	return createSubscribableJsxValue({
		getValue: () => state.get(),
		subscribe: (notify) => state.subscribe(notify),
	});
}
