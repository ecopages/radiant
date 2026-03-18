import type { JsxChild, JsxElement, TemplateResultLike } from './jsx-runtime';

export const ATTRIBUTE_BINDING_PREFIX = 'data-radiant-jsx-bind-';
export const ATTRIBUTE_BINDING_PATTERN = /^(.*?)(\s+)([@.?]?)([^\s"'<>/=`]+)=$/s;

export type BindingKind = 'attr' | 'bool' | 'event' | 'prop';

export type HydrationBinding = {
	kind: BindingKind;
	name: string;
	value: unknown;
};

export function collectHydrationBindings(value: JsxElement): Map<number, HydrationBinding> {
	const bindings = new Map<number, HydrationBinding>();
	const state = { nextIndex: 0 };

	collectValueBindings(value, bindings, state);

	return bindings;
}

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

export function serializeBindingDescriptor(kind: BindingKind, name: string): string {
	return `${kind}:${name}`;
}

function collectValueBindings(
	value: JsxChild,
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
			collectValueBindings(child as JsxChild, bindings, state);
		}
	}
}

function collectTemplateBindings(
	template: TemplateResultLike,
	bindings: Map<number, HydrationBinding>,
	state: { nextIndex: number },
): void {
	for (let index = 0; index < template.values.length; index += 1) {
		const stringPart = template.strings[index] ?? '';
		const attributeBinding = ATTRIBUTE_BINDING_PATTERN.exec(stringPart);

		if (attributeBinding) {
			const [, , , prefix, name] = attributeBinding;
			bindings.set(state.nextIndex, {
				kind: getBindingKind(prefix),
				name,
				value: template.values[index],
			});
			state.nextIndex += 1;
			continue;
		}

		collectValueBindings(template.values[index] as JsxChild, bindings, state);
	}
}

function isIterable(value: unknown): value is Iterable<unknown> {
	return typeof value !== 'string' && typeof value === 'object' && value !== null && Symbol.iterator in value;
}

function isTemplateResultLike(value: unknown): value is TemplateResultLike {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Partial<TemplateResultLike>)['_$litType$'] === 1 &&
		Array.isArray((value as Partial<TemplateResultLike>).strings) &&
		Array.isArray((value as Partial<TemplateResultLike>).values)
	);
}
