import { createSubscribableJsxValue, type JsxRenderable, type SubscribableJsxValue } from '@ecopages/jsx';

/**
 * Small writable wrapper around a subscribable JSX child value.
 *
 * The `renderable` field can be embedded directly in JSX, while `get()` and
 * `set(...)` expose imperative access for local entrypoint state.
 */
export interface WritableJsxValue<Value extends JsxRenderable> {
	readonly renderable: SubscribableJsxValue<Value>;
	get: () => Value;
	set: (nextValue: Value) => void;
}

/**
 * Creates a stable subscribable JSX child value backed by a local writable
 * store.
 */
export function createWritableJsxValue<Value extends JsxRenderable>(initialValue: Value): WritableJsxValue<Value> {
	let value = initialValue;
	const subscribers = new Set<(value: Value) => void>();
	const renderable = createSubscribableJsxValue<Value>({
		getValue: () => value,
		subscribe: (notify) => {
			subscribers.add(notify);

			return () => {
				subscribers.delete(notify);
			};
		},
	});

	return {
		renderable,
		get: () => value,
		set: (nextValue) => {
			if (Object.is(value, nextValue)) {
				return;
			}

			value = nextValue;

			for (const subscriber of subscribers) {
				subscriber(nextValue);
			}
		},
	};
}