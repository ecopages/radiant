/**
 * @description Stringifies the attribute value keeping the type.
 * This is useful for passing objects as attributes in JSX.
 * @example <my-app class="radiant-todo" hydrate-context={stringifyAttribute<MyType>(context)}>
 */
export function stringifyAttribute<T>(value: T): T {
  return JSON.stringify(value) as unknown as T;
}
