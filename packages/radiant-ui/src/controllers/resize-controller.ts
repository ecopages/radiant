import { bindController, type Controller, type ControllerHost } from './controller';

export type ResizeControllerConfig = {
	/** Resolved on every `attach()`; `null` entries are skipped. */
	getTargets: () => ReadonlyArray<Element | null>;
	onResize: (entries: ResizeObserverEntry[]) => void;
	options?: ResizeObserverOptions;
};

/**
 * Observes the size of elements from `attach()` until `destroy()`.
 *
 * @remarks Attaches to nothing when `ResizeObserver` is missing. Attaching again while attached changes nothing.
 */
export class ResizeController implements Controller {
	private observer: ResizeObserver | null = null;

	constructor(private readonly config: ResizeControllerConfig) {}

	attach(): void {
		if (this.observer || typeof ResizeObserver !== 'function') {
			return;
		}
		const observer = new ResizeObserver((entries) => this.config.onResize(entries));
		for (const target of this.config.getTargets()) {
			if (target) {
				observer.observe(target, this.config.options);
			}
		}
		this.observer = observer;
	}

	destroy(): void {
		this.observer?.disconnect();
		this.observer = null;
	}
}

/** Creates a `ResizeController` that attaches when `host` connects and is destroyed when it disconnects. */
export function createResizeController(host: ControllerHost, config: ResizeControllerConfig): ResizeController {
	return bindController(host, new ResizeController(config));
}
