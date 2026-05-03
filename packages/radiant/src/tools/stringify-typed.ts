/**
 * Converts the given value to a JSON string representation or maintains the type based on the generic parameter.
 *
 * @param value - The value to be converted.
 * @returns The JSON string representation of the value or the value itself.
 * @template T - The type of the value.
 * @template R - The return type, defaults to T.
 *
 * @example
 * // For maintaining the type in JSX attributes
 * <my-app my-complex-attribute={stringifyTyped<MyType>(myData)}> // myData is of type MyType
 *
 * // For lower-level JSON string generation outside JSX text children
 * const hydrationPayload = stringifyTyped<Partial<MyContext>, string>({ value: 'Hello World' });
 */
export function stringifyTyped<T, R = T>(value: T): R extends string ? string : T {
	return JSON.stringify(value) as unknown as R extends string ? string : T;
}
