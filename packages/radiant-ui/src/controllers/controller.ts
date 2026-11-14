/**
 * A reusable behavior that a component composes instead of reimplementing.
 *
 * @remarks
 * Not core's `RadiantController`, which is a reactive host with its own lifecycle. A radiant-ui controller is a
 * plain class: the constructor is inert (no DOM, no `window`), `attach()` starts work, and `destroy()` ends all of
 * it. Both must be safe to call repeatedly: `attach()` after `attach()` changes nothing, `destroy()` after
 * `destroy()` changes nothing, and a destroyed controller can be attached again.
 */
export interface Controller {
	attach(): void;
	destroy(): void;
}

/**
 * The part of a host a controller needs: the two registration methods of `RadiantElement` and `ReactiveHost`.
 *
 * @remarks Typed structurally so a plain test double satisfies it.
 */
export interface ControllerHost {
	registerConnectedCallback(callback: () => void): void;
	registerCleanupCallback(callback: () => void): void;
}

/**
 * Ties a controller to a host: `attach()` on every connect, `destroy()` on every cleanup.
 *
 * @remarks
 * The thin layer behind each `createX(host, config)` factory. Core runs connected callbacks at the start of each
 * connection, so a reconnected element attaches its controller again. The host is not connected yet when
 * the factory runs, so nothing touches the DOM until it connects.
 *
 * @returns The same controller, for the caller to keep.
 */
export function bindController<C extends Controller>(host: ControllerHost, controller: C): C {
	host.registerConnectedCallback(() => controller.attach());
	host.registerCleanupCallback(() => controller.destroy());
	return controller;
}
