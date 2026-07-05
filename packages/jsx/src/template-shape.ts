/** Kinds of dynamic bindings that the JSX runtime can encode into templates. */
export type BindingKind = 'attr' | 'bool' | 'event' | 'native-event' | 'prop';

/**
 * Cached metadata describing how one interpolation slot should be interpreted
 * during SSR, hydration binding collection, or DOM template compilation.
 */
export type TemplateInterpolationPart =
	| {
			string: string;
			type: 'child';
	  }
	| {
			kind: BindingKind;
			leading: string;
			name: string;
			prefix: string;
			whitespace: string;
			type: 'attribute';
	  };

/**
 * Matches a static template segment that ends with an attribute-like binding
 * placeholder such as ` class=`, ` ?hidden=`, ` @focus=`, ` !click=`, or ` .value=`.
 */
export const ATTRIBUTE_BINDING_PATTERN = /^(.*?)(\s+)([@.?!]?)([^\s"'<>/=`]+)=$/s;

export type TemplateShape = {
	/** Parsed interpolation slots for one tagged-template literal shape. */
	interpolationParts: readonly TemplateInterpolationPart[];
};

const TEMPLATE_SHAPE_CACHE = new WeakMap<readonly string[], TemplateShape>();
const TEMPLATE_SHAPE_CACHE_BY_KEY = new Map<string, TemplateShape>();

/** Resolves the logical binding kind from the runtime prefix used in JSX template strings.
 *
 * @param prefix One of `''`, `'?'`, `'!'`, `'@'`, or `'.'`.
 * @returns The binding kind used by serializers, hydration, and DOM compilation.
 */
export function getBindingKind(prefix: string): BindingKind {
	switch (prefix) {
		case '!':
			return 'event';
		case '@':
			return 'native-event';
		case '.':
			return 'prop';
		case '?':
			return 'bool';
		default:
			return 'attr';
	}
}

/** Derives a stable string cache key from a `TemplateStringsArray`. */
export function getTemplateCacheKey(strings: readonly string[]): string {
	return strings.map((part) => `${part.length}:${part}`).join('|');
}

/** Returns cached interpolation metadata for a template shape, parsing on first use. */
export function getTemplateShape(strings: readonly string[]): TemplateShape {
	const cachedShape = TEMPLATE_SHAPE_CACHE.get(strings);

	if (cachedShape) {
		return cachedShape;
	}

	const cacheKey = getTemplateCacheKey(strings);
	const cachedShapeByKey = TEMPLATE_SHAPE_CACHE_BY_KEY.get(cacheKey);

	if (cachedShapeByKey) {
		TEMPLATE_SHAPE_CACHE.set(strings, cachedShapeByKey);
		return cachedShapeByKey;
	}

	const interpolationParts = parseTemplateInterpolationParts(strings);
	const shape: TemplateShape = { interpolationParts };

	TEMPLATE_SHAPE_CACHE.set(strings, shape);
	TEMPLATE_SHAPE_CACHE_BY_KEY.set(cacheKey, shape);
	return shape;
}

/** Convenience accessor for interpolation parts on a template shape. */
export function getTemplateInterpolationParts(strings: readonly string[]): readonly TemplateInterpolationPart[] {
	return getTemplateShape(strings).interpolationParts;
}

function parseTemplateInterpolationParts(strings: readonly string[]): readonly TemplateInterpolationPart[] {
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

	return parts;
}
