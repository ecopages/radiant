/**
 * Converts the given value to a JSON string representation or maintains the type based on the generic parameter.
 *
 * @param value - The value to be converted.
 * @returns The JSON string representation of the value or the value itself.
 * @template T - The type of the value.
 * @template R - The return type, defaults to T.
 *
 * @example
 * // For JSON string representation
 * <script type="application/json" data-hydration>
 *  {stringifyTyped<Partial<MyContext>, string>({ value: 'Hello World' })}
 * </script>
 *
 * // For maintaining the type
 * <my-app my-complex-attribute={stringifyTyped<MyType>(myData)}> // myData is of type MyType
 */
export function stringifyTyped<T, R = T>(value: T): R extends string ? string : T {
  return JSON.stringify(value) as unknown as R extends string ? string : T;
}
