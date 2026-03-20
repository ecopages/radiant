import type { RadiantElement } from '../../core/radiant-element';

type LegacyInstanceInitializer = (instance: RadiantElement) => void;

const LEGACY_INSTANCE_INITIALIZERS = Symbol.for('@ecopages/radiant.legacy-instance-initializers');

/**
 * Registers per-instance initialization work for a legacy decorator.
 *
 * Legacy decorators execute against the prototype, so any initialization that
 * needs the concrete element instance must be deferred until construction time.
 */
export function registerLegacyInstanceInitializer(proto: object, initializer: LegacyInstanceInitializer): void {
	const target = proto as Record<PropertyKey, unknown>;
	const ownInitializers = target[LEGACY_INSTANCE_INITIALIZERS];

	if (Array.isArray(ownInitializers)) {
		ownInitializers.push(initializer);
		return;
	}

	Object.defineProperty(proto, LEGACY_INSTANCE_INITIALIZERS, {
		value: [initializer],
		configurable: true,
	});
}

/**
 * Runs all legacy decorator initializers for a newly constructed element.
 *
 * Initializers are collected from the prototype chain and executed from base to
 * derived class so inherited setup remains stable.
 */
export function runLegacyInstanceInitializers(instance: RadiantElement): void {
	const prototypes: object[] = [];
	let currentPrototype = Object.getPrototypeOf(instance);

	while (currentPrototype && currentPrototype !== Object.prototype) {
		prototypes.push(currentPrototype);
		currentPrototype = Object.getPrototypeOf(currentPrototype);
	}

	for (let index = prototypes.length - 1; index >= 0; index -= 1) {
		const initializers = (prototypes[index] as Record<PropertyKey, unknown>)[LEGACY_INSTANCE_INITIALIZERS] as
			| LegacyInstanceInitializer[]
			| undefined;

		if (!Array.isArray(initializers)) {
			continue;
		}

		for (const initializer of initializers) {
			initializer(instance);
		}
	}
}
