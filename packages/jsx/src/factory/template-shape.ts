import type { BindingKind, TemplatePartDescriptor } from '../types/renderable-types.ts';

export type { BindingKind, TemplatePartDescriptor };

/**
 * Matches a static template segment that ends with an attribute-like binding
 * placeholder such as ` class=`, ` ?hidden=`, ` @focus=`, ` !click=`, or ` .value=`.
 *
 * @remarks Only the transported wire format still embeds binding syntax in its
 * strings. Templates built by the JSX factory carry their parts explicitly, so this
 * pattern is not on any render path — it runs once per payload in
 * {@link deriveLegacyTemplateShape}.
 */
export const ATTRIBUTE_BINDING_PATTERN = /^(.*?)(\s+)([@.?!]?)([^\s"'<>/=`]+)=$/s;

/** Static template shape recovered from a transported payload. */
export type LegacyTemplateShape = {
	parts: TemplatePartDescriptor[];
	strings: string[];
};

/**
 * Resolves the logical binding kind from the sigil used in transported template strings.
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

/** Derives a stable identity for a template shape from its strings and parts. */
export function getTemplateShapeKey(strings: readonly string[], parts: readonly TemplatePartDescriptor[]): string {
	// Length-prefixing keeps the key unambiguous for strings containing the separator.
	const stringKey = strings.map((part) => `${part.length}:${part}`).join('|');
	const partKey = parts.map((part) => (part.type === 'child' ? 'c' : `${part.kind}:${part.name}`)).join(',');

	return `${stringKey}${partKey}`;
}

/**
 * Splits a transported template's sigil-bearing strings into plain static chunks
 * plus explicit part descriptors.
 *
 * This is the compatibility bridge for the wire format: it produces exactly what
 * the JSX factory would have emitted directly, so everything downstream sees one
 * representation.
 *
 * @param strings Wire-format strings, where an attribute slot's chunk ends in `name=`.
 */
export function deriveLegacyTemplateShape(strings: readonly string[]): LegacyTemplateShape {
	const staticStrings: string[] = [];
	const parts: TemplatePartDescriptor[] = [];

	for (let index = 0; index < strings.length - 1; index += 1) {
		const stringPart = strings[index] ?? '';
		const attributeBinding = ATTRIBUTE_BINDING_PATTERN.exec(stringPart);

		if (!attributeBinding) {
			staticStrings.push(stringPart);
			parts.push({ type: 'child' });
			continue;
		}

		const [, leading = '', , prefix = '', name = ''] = attributeBinding;
		staticStrings.push(leading);
		parts.push({ kind: getBindingKind(prefix), name, type: 'attribute' });
	}

	staticStrings.push(strings[strings.length - 1] ?? '');

	return { parts, strings: staticStrings };
}
