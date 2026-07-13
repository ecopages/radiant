export type LegacyPostConstructionPhase = 'connect' | 'ssr';

type LegacyInstanceInitializer<T extends object = object> = (instance: T) => void;
type LegacyPostConstructionInitializer<T extends object = object> = (
	instance: T,
	phase: LegacyPostConstructionPhase,
) => void;

const LEGACY_INSTANCE_INITIALIZERS = Symbol.for('@ecopages/radiant.legacy-instance-initializers');
const LEGACY_POST_CONSTRUCTION_INITIALIZERS = Symbol.for('@ecopages/radiant.legacy-post-construction-initializers');
const LEGACY_EXECUTED_POST_CONSTRUCTION_INITIALIZERS = Symbol.for(
	'@ecopages/radiant.legacy-executed-post-construction-initializers',
);

/**
 * Registers per-instance initialization work for a legacy decorator.
 *
 * Legacy decorators execute against the prototype, so any initialization that
 * needs the concrete element instance must be deferred until construction time.
 */
export function registerLegacyInstanceInitializer<T extends object>(
	proto: T,
	initializer: LegacyInstanceInitializer<T>,
): void {
	registerInitializer(proto, LEGACY_INSTANCE_INITIALIZERS, initializer);
}

/**
 * Registers post-construction work for a legacy decorator.
 *
 * This phase exists for decorators that eagerly write instance fields. With
 * legacy decorators plus `useDefineForClassFields`, subclass field definition
 * can overwrite values written during the base-class constructor.
 */
export function registerLegacyPostConstructionInitializer<T extends object>(
	proto: T,
	initializer: LegacyPostConstructionInitializer<T>,
): void {
	registerInitializer(proto, LEGACY_POST_CONSTRUCTION_INITIALIZERS, initializer);
}

/**
 * Runs all legacy decorator initializers for a newly constructed element.
 *
 * Initializers are collected from the prototype chain and executed from base to
 * derived class so inherited setup remains stable.
 */
export function runLegacyInstanceInitializers<T extends object>(instance: T): void {
	runLegacyInitializers(instance, LEGACY_INSTANCE_INITIALIZERS);
}

/**
 * Runs legacy decorator setup that must happen after subclass field
 * initialization has completed.
 *
 * Each initializer runs at most once per instance even if multiple lifecycle
 * entrypoints call this helper.
 */
export function runLegacyPostConstructionInitializers<T extends object>(
	instance: T,
	phase: LegacyPostConstructionPhase,
): void {
	const target = instance as Record<PropertyKey, unknown>;

	runLegacyPostConstructionInitializersOnPrototypeChain(
		instance,
		phase,
		(target[LEGACY_EXECUTED_POST_CONSTRUCTION_INITIALIZERS] ??= new Set()) as Set<
			LegacyPostConstructionInitializer<T>
		>,
	);
}

function registerInitializer<T extends object>(proto: T, key: symbol, initializer: LegacyInstanceInitializer<T> | LegacyPostConstructionInitializer<T>): void {
	const target = proto as Record<PropertyKey, unknown>;
	const ownInitializers = Object.prototype.hasOwnProperty.call(target, key) ? target[key] : undefined;

	if (Array.isArray(ownInitializers)) {
		ownInitializers.push(initializer);
		return;
	}

	Object.defineProperty(target, key, {
		value: [initializer],
	});
}

function runLegacyInitializers<T extends object>(instance: T, key: symbol): void {
	walkPrototypeChain(instance, (prototype) => {
		const initializers = (prototype as Record<PropertyKey, unknown>)[key] as LegacyInstanceInitializer<T>[] | undefined;

		if (!Array.isArray(initializers)) {
			return;
		}

		for (const initializer of initializers) {
			initializer(instance);
		}
	});
}

function runLegacyPostConstructionInitializersOnPrototypeChain<T extends object>(
	instance: T,
	phase: LegacyPostConstructionPhase,
	executedInitializers: Set<LegacyPostConstructionInitializer<T>>,
): void {
	for (const prototype of collectPrototypeChain(instance)) {
		const initializers = (prototype as Record<PropertyKey, unknown>)[LEGACY_POST_CONSTRUCTION_INITIALIZERS] as
			| LegacyPostConstructionInitializer<T>[]
			| undefined;

		if (!Array.isArray(initializers)) {
			continue;
		}

		for (const initializer of initializers) {
			if (executedInitializers.has(initializer)) {
				continue;
			}

			initializer(instance, phase);
			executedInitializers.add(initializer);
		}
	}
}

function collectPrototypeChain<T extends object>(instance: T): object[] {
	const prototypes: object[] = [];
	let prototype: object | null = Object.getPrototypeOf(instance);

	while (prototype && prototype !== Object.prototype) {
		prototypes.unshift(prototype);
		prototype = Object.getPrototypeOf(prototype);
	}

	return prototypes;
}

function walkPrototypeChain<T extends object>(instance: T, visit: (prototype: object) => void): void {
	for (const prototype of collectPrototypeChain(instance)) {
		visit(prototype);
	}
}
