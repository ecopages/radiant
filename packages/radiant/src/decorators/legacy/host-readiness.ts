import { runLegacyInstanceInitializers, runLegacyPostConstructionInitializers } from './instance-initializers';

export type LegacyHostReadinessPhase = 'construct' | 'connect' | 'ssr';

/**
 * Custom element constructor passed to `@customElement`.
 *
 * @remarks `any[]` matches `CustomElementConstructor`; controllers do not use this wrapper.
 */
type Constructable = new (...args: any[]) => HTMLElement;

/**
 * Runs legacy decorator initialization for the requested lifecycle phase.
 *
 * Post-construction work is idempotent — multiple calls with `connect` or `ssr`
 * only execute each registered initializer once per instance.
 */
export function ensureLegacyHostReady<T extends object>(host: T, phase: LegacyHostReadinessPhase): void {
	const instance = unwrapLegacyControllerHost(host);

	switch (phase) {
		case 'construct':
			runLegacyInstanceInitializers(instance);
			break;
		case 'connect':
			runLegacyPostConstructionInitializers(instance, 'connect');
			break;
		case 'ssr':
			runLegacyPostConstructionInitializers(instance, 'ssr');
			break;
	}
}

/**
 * Subclasses a decorated class so legacy post-construction setup runs when its constructor has finished.
 *
 * @remarks
 * Legacy property decorators see only the prototype, and `useDefineForClassFields` defines each field as an own
 * data property after `super()` returns. A write made right after `new` is then indistinguishable from a field
 * initializer until the reactive accessors replace those data properties. Installing them here, at the end of the
 * most derived constructor and before any caller code runs, matches the standard decorators, which set each member
 * up as its field initializes: a later write goes through the accessor and is recorded as explicit, so it wins over
 * an authored attribute at the first connect. Classes registered without this wrapper keep the connect-time
 * setup.
 *
 * Setup runs only when this class is the one constructed (`new.target`). A subclass, decorated or not, defines
 * its own fields after this constructor returns and would overwrite the accessors, so for it the setup waits for the
 * most derived wrapped class, or for connect.
 */
export function withLegacyConstructionEnd<T extends Constructable>(decorated: T): T {
	const Constructed = class extends decorated {
		constructor(...args: any[]) {
			super(...args);
			if (new.target === Constructed) {
				ensureLegacyHostReady(this, 'connect');
			}
		}
	};

	Object.defineProperty(Constructed, 'name', { value: decorated.name, configurable: true });
	return Constructed as T;
}

const completingLegacyConstruction = new WeakSet<object>();
const legacyControllerHosts = new WeakMap<object, object>();

/**
 * Runs legacy post-construction once the author's subclass fields exist, without wrapping that class.
 *
 * @remarks
 * Custom elements cannot return a substitute instance, so they keep {@link withLegacyConstructionEnd}
 * from `@customElement`. Controllers can: the constructor returns this proxy, class-field
 * `defineProperty` and initializer writes go through, and the first author-facing get after `new`
 * installs the accessors. A set during field initialization would run too early and register SSR
 * work twice. Keys in `internalKeys` are the controller's own constructor fields (`host`, `$`, …)
 * so a field initializer that reads `this.$` does not install too early.
 */
export function completeLegacyControllerConstruction<T extends object>(
	instance: T,
	internalKeys: ReadonlySet<PropertyKey>,
): T {
	const surface = new Proxy(instance, {
		get(target, prop, receiver) {
			completeIfAuthorKey(target, prop, internalKeys);
			return Reflect.get(target, prop, receiver);
		},
		set(target, prop, value) {
			return Reflect.set(target, prop, value, target);
		},
		defineProperty(target, prop, descriptor) {
			return Reflect.defineProperty(target, prop, descriptor);
		},
	});

	legacyControllerHosts.set(surface, instance);
	return surface;
}

function unwrapLegacyControllerHost<T extends object>(host: T): T {
	return (legacyControllerHosts.get(host) as T | undefined) ?? host;
}

function completeIfAuthorKey(target: object, prop: PropertyKey, internalKeys: ReadonlySet<PropertyKey>): void {
	if (completingLegacyConstruction.has(target) || internalKeys.has(prop) || typeof prop === 'symbol') {
		return;
	}

	completingLegacyConstruction.add(target);
	ensureLegacyHostReady(target, 'connect');
}
