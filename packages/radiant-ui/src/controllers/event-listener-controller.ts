import { bindController, type Controller, type ControllerHost } from './controller';

export type EventListenerControllerConfig = {
	/** Resolved on every `attach()`; `null` attaches nothing, so a server render never reaches `document`. */
	getTarget: () => EventTarget | null;
	type: string | readonly string[];
	listener: EventListener;
	options?: AddEventListenerOptions;
};

/**
 * Listens for one or more event types on a target from `attach()` until `destroy()`.
 *
 * @remarks
 * For listeners added and removed at runtime (a drag that listens on `document` only while the pointer is down)
 * or that need options such as `once`, `passive` and `capture`. Attaching again with the same target changes
 * nothing; with a different target it moves the listeners there. After a `once` listener has fired, call
 * `destroy()` before attaching again.
 */
export class EventListenerController implements Controller {
	private target: EventTarget | null = null;

	constructor(private readonly config: EventListenerControllerConfig) {}

	attach(): void {
		const target = this.config.getTarget();
		if (target === this.target) {
			return;
		}
		this.destroy();
		if (!target) {
			return;
		}
		for (const type of this.types()) {
			target.addEventListener(type, this.config.listener, this.config.options);
		}
		this.target = target;
	}

	destroy(): void {
		if (!this.target) {
			return;
		}
		for (const type of this.types()) {
			this.target.removeEventListener(type, this.config.listener, this.config.options);
		}
		this.target = null;
	}

	private types(): readonly string[] {
		const { type } = this.config;
		return typeof type === 'string' ? [type] : type;
	}
}

/** Creates an `EventListenerController` that attaches when `host` connects and is destroyed when it disconnects. */
export function createEventListenerController(
	host: ControllerHost,
	config: EventListenerControllerConfig,
): EventListenerController {
	return bindController(host, new EventListenerController(config));
}
