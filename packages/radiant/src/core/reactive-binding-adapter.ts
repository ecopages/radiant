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

/**
 * @remarks The source may not be a tracked signal, so subscribers read a computed over a
 * snapshot that the source subscription keeps current. Without subscribers, `get` projects
 * the source directly, so a read never writes to a signal.
 */
function projectReactiveState<Value extends JsxBindingSourceValue, Out extends JsxBindingSourceValue>(
	state: Pick<ReactiveState<Value>, 'get' | 'subscribe'>,
	project: (value: Value) => Out,
): Pick<ReactiveState<Out>, 'get' | 'subscribe'> {
	const snapshot = new State(untrack(() => state.get()));
	const computed = new Computed(() => project(snapshot.get()));
	let subscribers = 0;
	return {
		get: () => (subscribers > 0 ? computed.get() : project(state.get())),
		subscribe: (notify) => {
			const unsubscribeSource = state.subscribe((value) => snapshot.set(value));
			try {
				snapshot.set(untrack(() => state.get()));
				const unsubscribeComputed = computed.subscribe(notify);
				subscribers += 1;
				return () => {
					subscribers -= 1;
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
