import { bindController, type Controller, type ControllerHost } from './controller';

/** The elements and callback of a `ResizeController`. */
export type ResizeControllerConfig = {
	/** Resolved on every `attach()`; `null` entries are skipped. */
	getTargets: () => ReadonlyArray<Element | null>;
	onResize: (entries: ResizeObserverEntry[]) => void;
	options?: ResizeObserverOptions;
};

/**
 * Observes the size of elements from `attach()` until `destroy()`.
 *
 * @remarks
 * Attaching again with the same targets keeps the running observer; with different targets it moves the observer
 * there.
 */
export class ResizeController implements Controller {
	private observer: ResizeObserver | null = null;
	private observed: Element[] = [];

	constructor(private readonly config: ResizeControllerConfig) {}

	attach(): void {
		const targets = this.config.getTargets().filter((target) => target !== null);
		if (
			this.observer &&
			targets.length === this.observed.length &&
			targets.every((t, i) => t === this.observed[i])
		) {
			return;
		}
		this.destroy();
		const observer = new ResizeObserver((entries) => this.config.onResize(entries));
		for (const target of targets) {
			observer.observe(target, this.config.options);
		}
		this.observer = observer;
		this.observed = targets;
	}

	destroy(): void {
		this.observer?.disconnect();
		this.observer = null;
		this.observed = [];
	}
}

/**
 * Creates a `ResizeController` that attaches when `host` connects and is destroyed when it disconnects.
 *
 * @example
 * ```ts
 * // in a RadiantElement subclass
 * createResizeController(this, {
 *   getTargets: () => [this],
 *   onResize: ([entry]) => this.fit(entry.contentRect.width),
 * });
 * ```
 */
export function createResizeController(host: ControllerHost, config: ResizeControllerConfig): ResizeController {
	return bindController(host, new ResizeController(config));
}
