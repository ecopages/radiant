import { shouldDelegateEventBinding } from './event-binding-policy.ts';
import { forEachNormalizedAttribute } from './attribute-normalize.ts';
import { shouldUseAttributeBindingByDefaultForElement, shouldUseBooleanAttributeBinding } from './binding-defaults.ts';
import { isIterableJsxChild, resolveBindingShapeValue } from './renderable-guards.ts';
import {
	KEYED_VALUE_SYMBOL,
	RADIANT_TEMPLATE_RESULT,
	RADIANT_TEMPLATE_RESULT_FIELD,
	SLOT_JSX_VALUE_SYMBOL,
} from './types.ts';
import type {
	JsxComponent,
	JsxNodeLike,
	JsxPropsWithChildren,
	JsxRenderable,
	SlotJsxValue,
	TemplateResultLike,
} from './types.ts';

/** Well-known symbol that identifies a JSX fragment in the Radiant runtime. */
export const fragmentSymbol = Symbol.for('@ecopages/jsx.fragment');

export type JsxFragment = typeof fragmentSymbol;

/** HTML void element tag names — these elements must never receive a closing tag. */
const voidElementNames = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
]);

type ChildSlotMode = 'multiple' | 'single';

/**
 * Core element factory called by both {@link jsx} and {@link jsxs}.
 */
export function createJsxElement<Props extends object>(
	type: string | JsxFragment | JsxComponent<Props>,
	props: Props,
	childSlotMode: ChildSlotMode,
): JsxRenderable {
	const keyedValue = (props as { key?: unknown }).key;

	if (typeof type === 'function') {
		return wrapKeyedValue(type(props), keyedValue);
	}

	if (type === fragmentSymbol) {
		const fragmentChildren = (props as JsxPropsWithChildren).children;

		return wrapKeyedValue(normalizeChildrenWithMode(fragmentChildren, childSlotMode), keyedValue);
	}

	if (type === 'slot') {
		return wrapKeyedValue(createSlotJsxValue(props as JsxPropsWithChildren & { name?: unknown }), keyedValue);
	}

	const strings = [`<${type}`];
	const values: unknown[] = [];
	const { children, key: _key, ...rawAttributes } = props as JsxPropsWithChildren & Record<string, unknown>;
	forEachNormalizedAttribute(rawAttributes, (name, value) => {
		appendBinding(strings, values, type, name, value);
	});

	if (voidElementNames.has(type)) {
		strings[strings.length - 1] += '>';
		return wrapKeyedValue(
			createTemplateResult(
				strings,
				values,
				type,
				type.includes('-') ? (props as Record<string, unknown>) : undefined,
			),
			keyedValue,
		);
	}

	strings[strings.length - 1] += '>';
	appendElementChildren(strings, values, type, children, childSlotMode);
	strings[strings.length - 1] += `</${type}>`;

	return wrapKeyedValue(
		createTemplateResult(
			strings,
			values,
			type,
			type.includes('-') ? (props as Record<string, unknown>) : undefined,
		),
		keyedValue,
	);
}

export function createMarkupNodeLike(outerHTML: string): JsxNodeLike {
	return {
		nodeType: 1,
		outerHTML,
	};
}

function appendElementChildren(
	strings: string[],
	values: unknown[],
	type: string,
	children: JsxRenderable | undefined,
	childSlotMode: ChildSlotMode,
): void {
	if (type === 'script') {
		const rawTextContent = renderJsxRenderableToRawText(normalizeChildrenWithMode(children, childSlotMode));

		if (rawTextContent === '') {
			return;
		}

		values.push(createMarkupNodeLike(rawTextContent));
		strings.push('');
		return;
	}

	appendChildren(strings, values, children, childSlotMode);
}

function renderJsxRenderableToRawText(value: JsxRenderable | undefined): string {
	if (value === undefined || value === null || value === false || value === true) {
		return '';
	}

	if (typeof value === 'string') {
		return escapeRawTextElementText(value);
	}

	if (typeof value === 'number' || typeof value === 'bigint') {
		return String(value);
	}

	if (isIterableJsxChild(value)) {
		let rawText = '';

		for (const child of value) {
			rawText += renderJsxRenderableToRawText(child as JsxRenderable);
		}

		return rawText;
	}

	return escapeRawTextElementText(String(value));
}

function escapeRawTextElementText(value: string): string {
	return value.replace(/</g, '\\u003c');
}

function appendBinding(strings: string[], values: unknown[], elementName: string, name: string, value: unknown): void {
	if (value === undefined) {
		return;
	}

	const bindingShapeValue = resolveBindingShapeValue(value);
	const normalizedName = name.startsWith('attr:') ? name.slice(5) : name;

	if (name.startsWith('on-native:')) {
		strings[strings.length - 1] += ` @${name.slice('on-native:'.length)}=`;
		values.push(value);
		strings.push('');
		return;
	}

	if (name.startsWith('on:')) {
		const eventName = name.slice(3);
		strings[strings.length - 1] += shouldDelegateEventBinding(eventName) ? ` !${eventName}=` : ` @${eventName}=`;
		values.push(value);
		strings.push('');
		return;
	}

	if (name.startsWith('prop:')) {
		strings[strings.length - 1] += ` .${name.slice(5)}=`;
		values.push(value);
		strings.push('');
		return;
	}

	if (name.startsWith('attr:')) {
		strings[strings.length - 1] += ` ${normalizedName}=`;
		values.push(value);
		strings.push('');
		return;
	}

	if (typeof bindingShapeValue === 'boolean' && shouldUseBooleanAttributeBinding(normalizedName)) {
		strings[strings.length - 1] += ` ?${normalizedName}=`;
		values.push(value);
		strings.push('');
		return;
	}

	if (!shouldUseAttributeBindingByDefaultForElement(elementName, normalizedName)) {
		strings[strings.length - 1] += ` .${normalizedName}=`;
		values.push(value);
		strings.push('');
		return;
	}

	strings[strings.length - 1] += ` ${normalizedName}=`;
	values.push(value);
	strings.push('');
}

function appendChildren(
	strings: string[],
	values: unknown[],
	children: JsxRenderable | undefined,
	childSlotMode: ChildSlotMode,
): void {
	if (children === undefined || children === null || children === false) {
		return;
	}

	if (!isIterableJsxChild(children)) {
		values.push(normalizeChildren(children));
		strings.push('');
		return;
	}

	if (childSlotMode === 'multiple') {
		for (const child of children) {
			const normalizedChild = normalizeChildSlot(child as JsxRenderable);

			if (normalizedChild === undefined) {
				continue;
			}

			values.push(normalizedChild);
			strings.push('');
		}
		return;
	}

	const flattenedChildren = flattenChildren(children);

	if (flattenedChildren.length === 0) {
		return;
	}

	values.push(flattenedChildren as JsxRenderable);
	strings.push('');
}

function normalizeChildrenWithMode(children: JsxRenderable | undefined, childSlotMode: ChildSlotMode): JsxRenderable {
	if (childSlotMode === 'multiple' && isIterableJsxChild(children)) {
		const slots: JsxRenderable[] = [];

		for (const child of children) {
			const normalizedChild = normalizeChildSlot(child as JsxRenderable);

			if (normalizedChild !== undefined) {
				slots.push(normalizedChild);
			}
		}

		if (slots.length === 0) {
			return '';
		}

		if (slots.length === 1) {
			return slots[0];
		}

		return slots;
	}

	return normalizeChildren(children);
}

function normalizeChildSlot(child: JsxRenderable | undefined): JsxRenderable | undefined {
	if (child === undefined || child === null || child === false) {
		return undefined;
	}

	if (!isIterableJsxChild(child)) {
		return child;
	}

	const flattenedChildren = flattenChildren(child);
	return flattenedChildren.length === 0 ? undefined : (flattenedChildren as JsxRenderable);
}

function flattenChildren(children: JsxRenderable | undefined): unknown[] {
	const flattenedChildren: unknown[] = [];
	appendFlattenedChildren(flattenedChildren, children);
	return flattenedChildren;
}

function appendFlattenedChildren(flattenedChildren: unknown[], children: JsxRenderable | undefined): void {
	if (children === undefined || children === null || children === false) {
		return;
	}

	if (isIterableJsxChild(children)) {
		for (const child of children) {
			appendFlattenedChildren(flattenedChildren, child as JsxRenderable);
		}
		return;
	}

	flattenedChildren.push(children);
}

function normalizeChildren(children: JsxRenderable | undefined): JsxRenderable {
	if (children === undefined || children === null || children === false) {
		return '';
	}

	if (!isIterableJsxChild(children)) {
		return children;
	}

	const flattenedChildren = flattenChildren(children);

	if (flattenedChildren.length === 0) {
		return '';
	}

	if (flattenedChildren.length === 1) {
		return flattenedChildren[0] as JsxRenderable;
	}

	return flattenedChildren as JsxRenderable;
}

function createTemplateResult(
	strings: string[],
	values: unknown[],
	rootLocalName: string,
	ssrIntrinsicProps?: Readonly<Record<string, unknown>>,
): TemplateResultLike {
	return {
		[RADIANT_TEMPLATE_RESULT_FIELD]: RADIANT_TEMPLATE_RESULT,
		rootLocalName,
		ssrIntrinsicProps,
		strings: toTemplateStrings(strings),
		values,
	};
}

function wrapKeyedValue(value: JsxRenderable, key: unknown): JsxRenderable {
	if (typeof key !== 'string' && typeof key !== 'number') {
		return value;
	}

	return {
		key,
		value,
		[KEYED_VALUE_SYMBOL]: true,
	};
}

function createSlotJsxValue(props: JsxPropsWithChildren & { name?: unknown }): SlotJsxValue {
	return {
		fallback: props.children,
		name: typeof props.name === 'string' && props.name !== '' ? props.name : undefined,
		[SLOT_JSX_VALUE_SYMBOL]: true,
	};
}

function toTemplateStrings(strings: string[]): TemplateStringsArray {
	const templateStrings = [...strings] as unknown as TemplateStringsArray;
	Object.defineProperty(templateStrings, 'raw', {
		value: [...strings],
		writable: false,
	});
	return templateStrings;
}
