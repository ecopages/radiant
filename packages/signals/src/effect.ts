import { getActiveDependencyRecorder, scheduleMicrotask, setActiveDependencyRecorder } from './runtime';
import type { DependencyNode, EffectCallback, EffectOptions, EffectScheduler } from './types';

class EffectRunner {
	private cleanup: (() => void) | undefined;
	private readonly dependencies = new Map<DependencyNode, () => void>();
	private disposed = false;
	private queued = false;
	private readonly scheduler: EffectScheduler;

	constructor(
		private readonly callback: EffectCallback,
		options: EffectOptions,
	) {
		this.scheduler = options.scheduler ?? scheduleMicrotask;
	}

	public dispose(): void {
		if (this.disposed) {
			return;
		}

		this.disposed = true;
		this.cleanup?.();
		this.cleanup = undefined;

		for (const unsubscribe of this.dependencies.values()) {
			unsubscribe();
		}

		this.dependencies.clear();
	}

	public run = (): void => {
		if (this.disposed) {
			return;
		}

		this.queued = false;
		this.cleanup?.();
		this.cleanup = undefined;

		const nextDependencies = new Set<DependencyNode>();
		const previousActiveDependencyRecorder = getActiveDependencyRecorder();

		try {
			setActiveDependencyRecorder((dependency) => {
				nextDependencies.add(dependency);
			});
			const result = this.callback();

			if (typeof result === 'function') {
				this.cleanup = result;
			}
		} finally {
			setActiveDependencyRecorder(previousActiveDependencyRecorder);
		}

		this.syncDependencies(nextDependencies);
	};

	private handleDependencyChange = () => {
		if (this.disposed || this.queued) {
			return;
		}

		this.queued = true;
		this.scheduler(this.run);
	};

	private syncDependencies(nextDependencies: Set<DependencyNode>): void {
		for (const [dependency, unsubscribe] of this.dependencies) {
			if (nextDependencies.has(dependency)) {
				continue;
			}

			unsubscribe();
			this.dependencies.delete(dependency);
		}

		for (const dependency of nextDependencies) {
			if (this.dependencies.has(dependency)) {
				continue;
			}

			this.dependencies.set(dependency, dependency.subscribe(this.handleDependencyChange));
		}
	}
}

/**
 * Runs a reactive side effect and reschedules it when one of the signals read
 * during execution changes.
 *
 * The callback may return a cleanup function, which runs before the next
 * execution and again when the returned disposer is called.
 */
export function effect(callback: EffectCallback, options: EffectOptions = {}): () => void {
	const runner = new EffectRunner(callback, options);
	runner.run();
	return () => {
		runner.dispose();
	};
}
