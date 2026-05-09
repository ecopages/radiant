import type { ReactivePropertyOptions } from './reactive-prop-core';

const REACTIVE_PROP_DEFINITIONS = Symbol.for('@ecopages/radiant.reactivePropDefinitions');

export type ReactivePropDefinition = {
	name: string;
	options: ReactivePropertyOptions<unknown>;
};

type RadiantConstructorWithReactiveProps = CustomElementConstructor & {
	[REACTIVE_PROP_DEFINITIONS]?: ReactivePropDefinition[];
};

export function registerReactivePropDefinition(
	target: object,
	propertyName: string,
	options: ReactivePropertyOptions<unknown>,
): void {
	const constructor = target.constructor as RadiantConstructorWithReactiveProps;
	const definitions = constructor[REACTIVE_PROP_DEFINITIONS] ?? [];

	if (definitions.some((definition) => definition.name === propertyName)) {
		return;
	}

	definitions.push({ name: propertyName, options });
	constructor[REACTIVE_PROP_DEFINITIONS] = definitions;
}

export function getReactivePropDefinitions(target: object): ReactivePropDefinition[] {
	return ((target.constructor as RadiantConstructorWithReactiveProps)[REACTIVE_PROP_DEFINITIONS] ?? []).slice();
}
