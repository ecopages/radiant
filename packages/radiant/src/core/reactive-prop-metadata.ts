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
 */
export function ensureObservedAttributes(constructor: CustomElementConstructor, attributes: string[]): void {
	const ctor = constructor as RadiantCustomElementConstructor;
	const uniqueAttributes = attributes.filter(Boolean);
	if (!uniqueAttributes.length) {
		return;
	}

	const existing = Array.isArray(ctor.observedAttributes) ? [...ctor.observedAttributes] : [];
	let changed = false;

	for (const attribute of uniqueAttributes) {
		if (!existing.includes(attribute)) {
			existing.push(attribute);
			changed = true;
		}
	}

	if (!changed && ctor.observedAttributes === existing) {
		return;
	}

	Object.defineProperty(ctor, 'observedAttributes', {
		configurable: true,
		enumerable: true,
		get() {
			return existing;
		},
	});
}

export function attributeNameForProp(propertyName: string, options: ReactivePropertyOptions<unknown>): string {
	return options.attribute ?? propertyName;
}
