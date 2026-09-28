import { isSignalLikeValue, isSubscribableJsxValue } from '../types/renderable-guards.ts';

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
	const directAttributeNames = new Set<string>();

	for (const name in attributes) {
		if ((name.startsWith('aria-') || name.startsWith('data-')) && attributes[name] !== undefined) {
			directAttributeNames.add(name);
		}
	}

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
				if (!directAttributeNames.has(attributeName)) {
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

function normalizeMergedClassValue(classValue: unknown, classesValue: unknown): unknown {
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
