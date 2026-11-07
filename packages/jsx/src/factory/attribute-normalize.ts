import { isSignalLikeValue, isSubscribableJsxValue } from '../types/renderable-guards.ts';
import { shouldUseBooleanAttributeBinding } from './binding-defaults.ts';

/**
 * Iterates normalized JSX attributes and invokes `append` for each resolved name/value
 * pair. No intermediate record is created.
 *
 * @param attributes Raw JSX props object.
 * @param append Callback invoked once per normalized attribute name/value pair.
 */
export function forEachNormalizedAttribute(
	attributes: Record<string, unknown>,
	append: (name: string, value: unknown) => void,
): void {
	const classValue = normalizeMergedClassValue(attributes.class, attributes.classes);
	const directAttributeNames =
		attributes.data !== undefined || attributes.aria !== undefined
			? collectDirectAttributeNames(attributes)
			: undefined;

	if (classValue !== undefined) {
		append('class', classValue);
	}

	for (const name in attributes) {
		const value = attributes[name];
		if (value === undefined || name === 'key' || name === 'class' || name === 'classes') {
			continue;
		}

		if (name === 'data' || name === 'aria') {
			appendStructuredAttributes(name, value, (attributeName, attributeValue) => {
				if (!directAttributeNames?.has(attributeName)) {
					append(attributeName, attributeValue);
				}
			});
			continue;
		}

		if (name === 'style') {
			append('style', normalizeStyleValue(value));
			continue;
		}

		append(name, value);
	}
}

/**
 * @remarks An `aria-*` or `data-*` prop written directly wins over the same name from the `aria` or `data` object.
 */
function collectDirectAttributeNames(attributes: Record<string, unknown>): Set<string> | undefined {
	let names: Set<string> | undefined;

	for (const name in attributes) {
		if ((name.startsWith('aria-') || name.startsWith('data-')) && attributes[name] !== undefined) {
			(names ??= new Set()).add(name);
		}
	}

	return names;
}

function appendStructuredAttributes(
	prefix: 'aria' | 'data',
	value: unknown,
	append: (name: string, value: unknown) => void,
): void {
	if (!isPlainObject(value)) {
		return;
	}

	for (const name in value) {
		append(`${prefix}-${toKebabCase(name)}`, value[name]);
	}
}

/**
 * @remarks A plain non-empty `class` string with no `classes` is returned as it is, skipping the token list: it is
 * the common case, and joining one token gives the same string.
 */
function normalizeMergedClassValue(classValue: unknown, classesValue: unknown): unknown {
	if (classesValue === undefined && typeof classValue === 'string') {
		return classValue === '' ? undefined : classValue;
	}

	const tokens: string[] = [];
	appendClassTokens(tokens, classValue);
	appendClassTokens(tokens, classesValue);
	return tokens.length === 0 ? undefined : tokens.join(' ');
}

function appendClassTokens(tokens: string[], value: unknown): void {
	if (value === undefined || value === null || value === false || value === true) {
		return;
	}

	if (typeof value === 'string') {
		if (value !== '') {
			tokens.push(value);
		}
		return;
	}

	if (typeof value === 'number' || typeof value === 'bigint') {
		tokens.push(String(value));
		return;
	}

	if (Array.isArray(value)) {
		for (const entry of value) {
			appendClassTokens(tokens, entry);
		}
		return;
	}

	if (!isPlainObject(value)) {
		return;
	}

	for (const [name, enabled] of Object.entries(value)) {
		if (enabled) {
			tokens.push(name);
		}
	}
}

/**
 * Converts a resolved `style` snapshot to a CSS declaration string for the `style` attribute.
 */
export function serializeStyleSnapshot(value: unknown): string {
	if (!isPlainObject(value)) {
		return String(value);
	}

	const declarations: string[] = [];

	for (const [name, entry] of Object.entries(value)) {
		if (entry === undefined || entry === null || entry === '') {
			continue;
		}

		declarations.push(`${toKebabCase(name)}: ${String(entry)}`);
	}

	return declarations.join('; ');
}

/**
 * The text a server renderer writes for one resolved attribute value, or `undefined` when the attribute is
 * left off.
 *
 * @param name Attribute name; `style` values go through {@link serializeStyleSnapshot}.
 * @param value Resolved (non-reactive) value.
 * @param presence Treat the attribute as boolean: a non-empty string is written as given, any other truthy value
 * yields `''` (present), and a falsy one, `''` included, `undefined`.
 *
 * @remarks A boolean value on a standard HTML boolean attribute (`hidden`, `disabled`, ...) also binds by presence,
 * whatever the binding kind, so a binding whose first value was not a boolean, or `attr:hidden={false}`, never
 * writes `"false"`, which browsers read as present. A string such as `hidden="until-found"` is written as given on
 * either path, so a binding whose first value was a boolean still writes a later string.
 * `undefined` and `null` always skip. Skipping client-only bindings (`prop`, events) depends on the
 * binding kind rather than the value, so callers decide that before calling.
 */
export function resolveAttributeText(name: string, value: unknown, presence = false): string | undefined {
	if (presence && typeof value === 'string' && value !== '') return value;
	if (presence || (typeof value === 'boolean' && shouldUseBooleanAttributeBinding(name)))
		return value ? '' : undefined;
	if (value === undefined || value === null) return undefined;
	return name.toLowerCase() === 'style' ? serializeStyleSnapshot(value) : String(value);
}

/**
 * @remarks
 * Keep reactive sources intact — object-style normalization runs only on plain snapshots.
 */
function normalizeStyleValue(value: unknown): unknown {
	if (isSubscribableJsxValue(value) || isSignalLikeValue(value) || !isPlainObject(value)) {
		return value;
	}

	return serializeStyleSnapshot(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toKebabCase(value: string): string {
	return value.replace(/[A-Z]/g, (segment) => `-${segment.toLowerCase()}`);
}
