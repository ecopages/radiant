type LegacyInstanceInitializer<T extends object = object> = (instance: T) => void;

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
	initializer: LegacyInstanceInitializer<T>,
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
export function runLegacyPostConstructionInitializers<T extends object>(instance: T): void {
	const target = instance as Record<PropertyKey, unknown>;

	runLegacyInitializers(
		instance,
		LEGACY_POST_CONSTRUCTION_INITIALIZERS,
		(target[LEGACY_EXECUTED_POST_CONSTRUCTION_INITIALIZERS] ??= new Set()) as Set<LegacyInstanceInitializer<T>>,
	);
}

function registerInitializer<T extends object>(proto: T, key: symbol, initializer: LegacyInstanceInitializer<T>): void {
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

function runLegacyInitializers<T extends object>(
	instance: T,
	key: symbol,
	executedInitializers?: Set<LegacyInstanceInitializer<T>>,
	prototype: object | null = Object.getPrototypeOf(instance),
): void {
	if (!prototype || prototype === Object.prototype) {
		return;
	}

	runLegacyInitializers(instance, key, executedInitializers, Object.getPrototypeOf(prototype));

	const initializers = (prototype as Record<PropertyKey, unknown>)[key] as LegacyInstanceInitializer<T>[] | undefined;

	if (!Array.isArray(initializers)) {
		return;
	}

	for (const initializer of initializers) {
		if (executedInitializers?.has(initializer)) {
			continue;
		}

		initializer(instance);
		executedInitializers?.add(initializer);
	}
}
