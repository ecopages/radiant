import type { JsxRenderable, TemplateResultLike } from './jsx-runtime';

/** Attribute prefix used for emitted SSR hydration markers. */
export const ATTRIBUTE_BINDING_PREFIX = 'data-radiant-jsx-bind-';
/**
 * Matches a static template segment that ends with an attribute-like binding
 * placeholder such as ` class=`, ` ?hidden=`, ` @click=`, or ` .value=`.
 */
export const ATTRIBUTE_BINDING_PATTERN = /^(.*?)(\s+)([@.?]?)([^\s"'<>/=`]+)=$/s;

/** Kinds of dynamic bindings that the JSX runtime can encode into templates. */
export type BindingKind = 'attr' | 'bool' | 'event' | 'prop';

/**
 * Cached metadata describing how one interpolation slot should be interpreted
 * during SSR, hydration binding collection, or DOM template compilation.
 */
export type TemplateInterpolationPart =
	| {
			/** Literal HTML prefix to write before rendering a child interpolation. */
			string: string;
			type: 'child';
	  }
	| {
			/** Binding kind inferred from the interpolation prefix. */
			kind: BindingKind;
			/** Static HTML emitted before the binding marker. */
			leading: string;
			/** Final DOM attribute or property name. */
			name: string;
			/** Raw prefix from the template syntax such as `?`, `@`, or `.`. */
			prefix: string;
			/** Whitespace that originally separated the attribute from prior markup. */
			whitespace: string;
			type: 'attribute';
	  };

const TEMPLATE_INTERPOLATION_CACHE = new WeakMap<readonly string[], readonly TemplateInterpolationPart[]>();
const TEMPLATE_INTERPOLATION_CACHE_BY_KEY = new Map<string, readonly TemplateInterpolationPart[]>();

export type HydrationBinding = {
	/** Binding category used by the hydrator. */
	kind: BindingKind;
	/** DOM attribute or property name that should be reconnected. */
	name: string;
	/** Original dynamic value that will be rebound during hydration. */
	value: unknown;
};

/**
 * Walks a JSX value tree and records the hydration bindings in SSR encounter
 * order.
 *
 * The resulting map uses the same binding indexes that `renderToString(...,
 * { hydrate: true })` writes into the HTML, allowing the DOM hydrator to match
 * serialized markers back to their original values.
 *
 * @param value JSX value to inspect.
 * @returns Ordered binding map keyed by hydration binding index.
 */
export function collectHydrationBindings(value: JsxRenderable): Map<number, HydrationBinding> {
	const bindings = new Map<number, HydrationBinding>();
	const state = { nextIndex: 0 };

	collectValueBindings(value, bindings, state);

	return bindings;
}

/**
 * Resolves the logical binding kind from the runtime prefix used in JSX
 * template strings.
 *
 * @param prefix Raw prefix emitted by the JSX runtime.
 * @returns Binding category consumed by the hydrator and DOM renderer.
 */
export function getBindingKind(prefix: string): BindingKind {
	switch (prefix) {
		case '@':
			return 'event';
		case '.':
			return 'prop';
		case '?':
			return 'bool';
		default:
			return 'attr';
	}
}

/**
 * Parses a serialized hydration descriptor back into its binding metadata.
 *
 * @param value Descriptor produced by {@link serializeBindingDescriptor}.
 * @returns Parsed descriptor, or `undefined` when the value is malformed.
 */
export function parseBindingDescriptor(value: string): Pick<HydrationBinding, 'kind' | 'name'> | undefined {
	const separatorIndex = value.indexOf(':');

	if (separatorIndex === -1) {
		return undefined;
	}

	const kind = value.slice(0, separatorIndex) as BindingKind;
	const name = value.slice(separatorIndex + 1);

	if (!name || !['attr', 'bool', 'event', 'prop'].includes(kind)) {
		return undefined;
	}

	return { kind, name };
}

/**
 * Encodes a binding kind and name into the compact descriptor stored in SSR
 * hydration marker attributes.
 *
 * @param kind Binding category to serialize.
 * @param name DOM attribute or property name.
 * @returns Compact descriptor string used in hydration markers.
 */
export function serializeBindingDescriptor(kind: BindingKind, name: string): string {
	return `${kind}:${name}`;
}

/**
 * Parses the static segments for a template shape once and caches the
 * interpolation metadata by template shape.
 *
 * The cache uses the string-array identity when available and falls back to a
 * stable shape key when the runtime rebuilds the `TemplateStringsArray`. That
 * keeps server rendering and DOM compilation fast without assuming one cache
 * strategy fits every template producer.
 *
 * @param strings Static template segments for one JSX template shape.
 * @returns Parsed interpolation metadata for each dynamic slot.
 */
export function getTemplateInterpolationParts(strings: readonly string[]): readonly TemplateInterpolationPart[] {
	const cachedParts = TEMPLATE_INTERPOLATION_CACHE.get(strings);

	if (cachedParts) {
		return cachedParts;
	}

	const cacheKey = getTemplateCacheKey(strings);
	const cachedPartsByKey = TEMPLATE_INTERPOLATION_CACHE_BY_KEY.get(cacheKey);

	if (cachedPartsByKey) {
		TEMPLATE_INTERPOLATION_CACHE.set(strings, cachedPartsByKey);
		return cachedPartsByKey;
	}

	const parts: TemplateInterpolationPart[] = [];

	for (let index = 0; index < strings.length - 1; index += 1) {
		const stringPart = strings[index] ?? '';
		const attributeBinding = ATTRIBUTE_BINDING_PATTERN.exec(stringPart);

		if (!attributeBinding) {
			parts.push({
				string: stringPart,
				type: 'child',
			});
			continue;
		}

		const [, leading = '', whitespace = ' ', prefix = '', name = ''] = attributeBinding;
		parts.push({
			kind: getBindingKind(prefix),
			leading,
			name,
			prefix,
			whitespace,
			type: 'attribute',
		});
	}

	TEMPLATE_INTERPOLATION_CACHE.set(strings, parts);
	TEMPLATE_INTERPOLATION_CACHE_BY_KEY.set(cacheKey, parts);
	return parts;
}

function getTemplateCacheKey(strings: readonly string[]): string {
	return strings.map((part) => `${part.length}:${part}`).join('|');
}

function collectValueBindings(
	value: JsxRenderable,
	bindings: Map<number, HydrationBinding>,
	state: { nextIndex: number },
): void {
	if (value === undefined || value === null || value === false || value === true) {
		return;
	}

	if (isTemplateResultLike(value)) {
		collectTemplateBindings(value, bindings, state);
		return;
	}

	if (isIterable(value)) {
		for (const child of value) {
			collectValueBindings(child as JsxRenderable, bindings, state);
		}
	}
}

function collectTemplateBindings(
	template: TemplateResultLike,
	bindings: Map<number, HydrationBinding>,
	state: { nextIndex: number },
): void {
	const interpolationParts = getTemplateInterpolationParts(template.strings);

	for (let index = 0; index < template.values.length; index += 1) {
		const interpolationPart = interpolationParts[index];

		if (interpolationPart?.type === 'attribute') {
			bindings.set(state.nextIndex, {
				kind: interpolationPart.kind,
				name: interpolationPart.name,
				value: template.values[index],
			});
			state.nextIndex += 1;
			continue;
		}

		collectValueBindings(template.values[index] as JsxRenderable, bindings, state);
	}
}

function isIterable(value: unknown): value is Iterable<unknown> {
	return typeof value !== 'string' && typeof value === 'object' && value !== null && Symbol.iterator in value;
}

function isTemplateResultLike(value: unknown): value is TemplateResultLike {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Partial<TemplateResultLike>)['_$rType$'] === 1 &&
		Array.isArray((value as Partial<TemplateResultLike>).strings) &&
		Array.isArray((value as Partial<TemplateResultLike>).values)
	);
}
