import {
	createSubscribableJsxValue,
	type JsxBindingSourceValue,
	type SubscribableJsxValueWithAccess,
} from '@ecopages/jsx';
import { Computed, State, untrack } from '@ecopages/signals';
import type { ReactiveState } from './reactivity-contract';

/**
 * Adapts a host member {@link ReactiveState} into the jsx binding shape.
 *
 * @remarks JSX member access delegates to `map`; replacing that method keeps both
 * member access and explicit projections tracked through the same computed value.
 * The separate module keeps JSX imports out of `reactive-host.ts`.
 */
export function adaptReactiveStateToJsxBinding<Value extends JsxBindingSourceValue>(
	state: Pick<ReactiveState<Value>, 'get' | 'subscribe'>,
): SubscribableJsxValueWithAccess<Value> {
	const binding = createSubscribableJsxValue({
		getValue: () => state.get(),
		subscribe: (notify) => state.subscribe(notify),
	});
	return Object.assign(binding, {
		map: <Out extends JsxBindingSourceValue>(project: (value: Value) => Out) =>
			adaptReactiveStateToJsxBinding(projectReactiveState(state, project)),
	});
}

function projectReactiveState<Value extends JsxBindingSourceValue, Out extends JsxBindingSourceValue>(
	state: Pick<ReactiveState<Value>, 'get' | 'subscribe'>,
	project: (value: Value) => Out,
): Pick<ReactiveState<Out>, 'get' | 'subscribe'> {
	const snapshot = new State(untrack(() => state.get()));
	const computed = new Computed(() => project(snapshot.get()));
	return {
		get: () => {
			snapshot.set(state.get());
			return computed.get();
		},
		subscribe: (notify) => {
			const unsubscribeSource = state.subscribe((value) => snapshot.set(value));
			try {
				snapshot.set(state.get());
				const unsubscribeComputed = computed.subscribe(notify);
				return () => {
					unsubscribeComputed();
					unsubscribeSource();
				};
			} catch (error) {
				unsubscribeSource();
				throw error;
			}
		},
	};
}
