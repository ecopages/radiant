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
	if (phase === 'construct') {
		runLegacyInstanceInitializers(host);
		return;
	}

	runLegacyPostConstructionInitializers(host, phase);
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
