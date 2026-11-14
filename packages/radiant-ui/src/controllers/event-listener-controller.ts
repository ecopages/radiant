import { bindController, type Controller, type ControllerHost } from './controller';

type EventMapOf<T> = T extends Window
	? WindowEventMap
	: T extends Document
		? DocumentEventMap
		: T extends HTMLElement
			? HTMLElementEventMap
			: T extends Element
				? ElementEventMap
				: T extends MediaQueryList
					? MediaQueryListEventMap
					: object;

/** The event a listener receives for `type` on `T`: the typed event when the DOM maps it, else a plain `Event`. */
export type EventOf<T, K extends string> = K extends keyof EventMapOf<T> ? EventMapOf<T>[K] : Event;

export type EventListenerControllerConfig<T extends EventTarget = EventTarget, K extends string = string> = {
	/** Resolved on every `attach()`; `null` attaches nothing, so a server render never reaches `document`. */
	getTarget: () => T | null;
	type: K | readonly K[];
	listener(event: EventOf<T, K>): void;
	/** `once` ends the whole controller after the first event of any listed type; see the class remarks. */
	options?: AddEventListenerOptions;
};

/**
 * Listens for one or more event types on a target from `attach()` until `destroy()`.
 *
 * @remarks
 * For listeners added and removed at runtime (a drag that listens on `document` only while the pointer is down)
 * or that need options such as `once`, `passive` and `capture`. The listener is typed from the target and the
 * event type, so `getTarget: () => document` with `type: 'pointermove'` gives a `PointerEvent` and needs no cast.
 * Attaching again with the same target changes nothing; with a different target it moves the listeners there.
 *
 * `once` is handled here, not by the DOM: the first event of any listed type runs the listener and detaches every
 * type, so a later `attach()` registers them again without a `destroy()` in between.
 */
export class EventListenerController<T extends EventTarget = EventTarget, K extends string = string>
	implements Controller
{
	private target: T | null = null;

	private readonly handler = (event: Event): void => {
		if (this.config.options?.once) {
			this.destroy();
		}
		this.config.listener(event as EventOf<T, K>);
	};

	constructor(private readonly config: EventListenerControllerConfig<T, K>) {}

	attach(): void {
		const target = this.config.getTarget();
		if (target === this.target) {
			return;
		}
		this.destroy();
		if (!target) {
			return;
		}
		const options = this.listenerOptions();
		for (const type of this.types()) {
			target.addEventListener(type, this.handler, options);
		}
		this.target = target;
	}

	destroy(): void {
		if (!this.target) {
			return;
		}
		const options = this.listenerOptions();
		for (const type of this.types()) {
			this.target.removeEventListener(type, this.handler, options);
		}
		this.target = null;
	}

	private types(): readonly string[] {
		const { type } = this.config;
		return typeof type === 'string' ? [type] : (type as readonly string[]);
	}

	private listenerOptions(): AddEventListenerOptions | undefined {
		const { options } = this.config;
		if (!options) {
			return undefined;
		}
		const { once: _once, ...rest } = options;
		return rest;
	}
}

/** Creates an `EventListenerController` that attaches when `host` connects and is destroyed when it disconnects. */
export function createEventListenerController<T extends EventTarget = EventTarget, K extends string = string>(
	host: ControllerHost,
	config: EventListenerControllerConfig<T, K>,
): EventListenerController<T, K> {
	return bindController(host, new EventListenerController(config));
}
