import type { ReactivePropertyOptions } from './reactive-prop-core';

const REACTIVE_PROP_DEFINITIONS = Symbol.for('@ecopages/radiant.reactivePropDefinitions');

/** Shared Stage 3 decorator metadata key for `@prop` definitions collected before `customElements.define`. */
export const REACTIVE_PROP_METADATA = Symbol.for('@ecopages/radiant.reactivePropMetadata');

export type ReactivePropDefinition = {
	name: string;
	options: ReactivePropertyOptions<unknown>;
};

type RadiantConstructorWithReactiveProps = CustomElementConstructor & {
	[REACTIVE_PROP_DEFINITIONS]?: ReactivePropDefinition[];
};

function resolveConstructor(target: object): RadiantConstructorWithReactiveProps {
	if (typeof target === 'function') {
		return target as RadiantConstructorWithReactiveProps;
	}

	return target.constructor as RadiantConstructorWithReactiveProps;
}

export function registerReactivePropDefinition(
	target: object,
	propertyName: string,
	options: ReactivePropertyOptions<unknown>,
): void {
	const constructor = resolveConstructor(target);
	const definitions = constructor[REACTIVE_PROP_DEFINITIONS] ?? [];

	if (definitions.some((definition) => definition.name === propertyName)) {
		return;
	}

	definitions.push({ name: propertyName, options });
	constructor[REACTIVE_PROP_DEFINITIONS] = definitions;
}

export function getReactivePropDefinitions(target: object): ReactivePropDefinition[] {
	return (resolveConstructor(target)[REACTIVE_PROP_DEFINITIONS] ?? []).slice();
}

type RadiantCustomElementConstructor = CustomElementConstructor & {
	observedAttributes?: string[];
};

/**
 * Ensure attribute names are listed on `static observedAttributes` before
 * `customElements.define` snapshots the list.
 *
 * Composes with a pre-existing `static get observedAttributes()` (e.g. a
 * subclass computing its own dynamic list) instead of freezing it into a
 * static snapshot: the installed getter re-invokes the previous one on every
 * read, so its live/computed behavior survives.
 */
export function ensureObservedAttributes(constructor: CustomElementConstructor, attributes: string[]): void {
	const ctor = constructor as RadiantCustomElementConstructor;
	const uniqueAttributes = attributes.filter(Boolean);
	if (!uniqueAttributes.length) {
		return;
	}

	const ownDescriptor = Object.getOwnPropertyDescriptor(ctor, 'observedAttributes');
	const previousGetter = ownDescriptor?.get;
	const baseAttributes = previousGetter
		? previousGetter.call(ctor)
		: Array.isArray(ctor.observedAttributes)
			? ctor.observedAttributes
			: [];
	const existing = Array.isArray(baseAttributes) ? [...baseAttributes] : [];
	let changed = false;

	for (const attribute of uniqueAttributes) {
		if (!existing.includes(attribute)) {
			existing.push(attribute);
			changed = true;
		}
	}

	if (!changed && !previousGetter) {
		return;
	}

	const get = previousGetter
		? () => Array.from(new Set([...(previousGetter.call(ctor) as string[]), ...existing]))
		: () => existing;

	Object.defineProperty(ctor, 'observedAttributes', {
		configurable: ownDescriptor?.configurable ?? true,
		enumerable: true,
		get,
	});
}

export function attributeNameForProp(propertyName: string, options: ReactivePropertyOptions<unknown>): string {
	return options.attribute ?? propertyName;
}

/**
 * Apply every `@prop` attribute name from the constructor registry to `observedAttributes`.
 * Radiant `@customElement` calls this immediately before `customElements.define`.
 *
 * Legacy `@prop` only registers metadata on the class; without `@customElement` you must call
 * this (or `ensureObservedAttributes` with the same names) before `define` if attributes should be observed.
 */
export function applyObservedAttributesFromPropRegistry(constructor: CustomElementConstructor): void {
	const attributeNames = getReactivePropDefinitions(constructor).map((definition) =>
		attributeNameForProp(definition.name, definition.options),
	);
	ensureObservedAttributes(constructor, attributeNames);
}
