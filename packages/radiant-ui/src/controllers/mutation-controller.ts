import { bindController, type Controller, type ControllerHost } from './controller';

export type MutationControllerConfig = {
	/** Resolved on every `attach()`, so a changed target is picked up by attaching again. */
	getTarget: () => Node | null;
	options: MutationObserverInit;
	onMutate: (records: MutationRecord[]) => void;
};

/**
 * Observes a node for DOM mutations from `attach()` until `destroy()`.
 *
 * @remarks
 * Attaches to nothing when `getTarget()` returns `null`. Attaching again with the
 * same target keeps the running observer; with a different target it moves the observer there.
 */
export class MutationController implements Controller {
	private observer: MutationObserver | null = null;
	private observed: Node | null = null;

	constructor(private readonly config: MutationControllerConfig) {}

	attach(): void {
		const target = this.config.getTarget();
		if (target === this.observed) {
			return;
		}
		this.destroy();
		if (!target) {
			return;
		}
		this.observer = new MutationObserver((records) => this.config.onMutate(records));
		this.observer.observe(target, this.config.options);
		this.observed = target;
	}

	destroy(): void {
		this.observer?.disconnect();
		this.observer = null;
		this.observed = null;
	}
}

/** Creates a `MutationController` that attaches when `host` connects and is destroyed when it disconnects. */
export function createMutationController(host: ControllerHost, config: MutationControllerConfig): MutationController {
	return bindController(host, new MutationController(config));
}
