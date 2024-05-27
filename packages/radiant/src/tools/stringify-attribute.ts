/**
 * Converts the given value to a JSON string representation.
 * This can be very handy for passing complex objects as attributes.
 *
 * @param value - The value to be converted.
 * @returns The JSON string representation of the value.
 * @template T - The type of the value.
 *
 * @example <my-app class="radiant-todo" hydrate-context={stringifyAttribute<MyType>(context)}>
 */
export function stringifyAttribute<T>(value: T): T {
  return JSON.stringify(value) as unknown as T;
}
