import {
	assertSignalAccessAllowed,
	currentComputedSignal,
	defaultEquals,
	getActiveComputedSignal,
	getActiveDependencyRecorder,
	setActiveComputedSignal,
	setActiveDependencyRecorder,
} from './runtime';
import { collectErrors, SignalNode, throwCollected } from './signal-node';
import type { ComputedCallback, DependencyNode, SignalEquals, SignalOptions, SignalSubscriber } from './types';

const COMPUTED_NO_ERROR = Symbol.for('@ecopages/signals.computed-no-error');

/**
 * Lazily derived signal backed by other signals read during evaluation.
 *
 * Dependencies are discovered automatically every time the computation runs,
 * and the last successful value or thrown error is cached until one of those
 * dependencies changes.
 */
export class Computed<Value> extends SignalNode<Value> {
	private readonly compute: ComputedCallback<Value>;
	private readonly dependencyUnsubscribers = new Map<DependencyNode, () => void>();
	private readonly dependencyWatcherUnsubscribers = new Map<DependencyNode, () => void>();
	private readonly equals: SignalEquals<Value>;
	private dependencies = new Map<DependencyNode, number>();
	private computing = false;
	private error: unknown = undefined;
	private hasError = false;
	private initialized = false;
	private pendingDependencies = new Map<DependencyNode, number>();
	private stale = true;
	private value!: Value;

	/**
	 * Creates a lazily evaluated derived signal.
	 *
	 * The compute function only reruns when the cached dependency versions become
	 * stale, and the optional equality callback controls whether a recomputation
	 * publishes a new exposed value.
	 */
	constructor(compute: ComputedCallback<Value>, options: SignalOptions<Value> = {}) {
		super(options);
		this.compute = compute;
		this.equals = (options.equals ?? defaultEquals) as SignalEquals<Value>;
	}

	/**
	 * Returns the cached value, recomputing lazily when tracked dependencies have
	 * changed.
	 *
	 * If the latest evaluation threw, the cached error is rethrown until a
	 * dependency invalidates the computed signal.
	 */
	public get(): Value {
		assertSignalAccessAllowed();
		this.refreshIfNeeded();
		this.connectToActiveComputed();

		if (this.hasError) {
			throw this.error;
		}

		return this.value;
	}

	/**
	 * Subscribes to changes in the computed signal's exposed value.
	 *
	 * The first subscriber eagerly initializes dependency subscriptions so future
	 * source writes can invalidate and republish this computed signal.
	 */
	public subscribe(notify: SignalSubscriber<Value>): () => void {
		const wasEmpty = this.subscribers.size === 0;
		this.subscribers.add(notify);

		if (wasEmpty) {
			try {
				this.refreshIfNeeded();
				this.syncDependencySubscriptions();
			} catch (error) {
				this.subscribers.delete(notify);
				throw error;
			}
		}

		return () => {
			this.subscribers.delete(notify);

			if (this.subscribers.size === 0) {
				this.clearDependencySubscriptions();
			}
		};
	}

	private clearDependencySubscriptions(): void {
		for (const unsubscribe of this.dependencyUnsubscribers.values()) {
			unsubscribe();
		}

		this.dependencyUnsubscribers.clear();
	}

	private clearDependencyWatcherSubscriptions(rollback: boolean): void {
		const unsubscribers = [...this.dependencyWatcherUnsubscribers.values()];

		if (rollback) {
			unsubscribers.reverse();
		}

		this.dependencyWatcherUnsubscribers.clear();
		throwCollected(collectErrors(unsubscribers));
	}

	private handleDependencyChange = () => {
		this.stale = true;

		if (this.subscribers.size === 0) {
			return;
		}

		const previousVersion = this.version;
		this.refreshIfNeeded();

		if (this.version !== previousVersion && !this.hasError) {
			this.publish(this.value);
		}
	};

	private handleDependencyWatcherChange = () => {
		this.stale = true;
		this.notifyWatchers();
	};

	private haveDependenciesChanged(): boolean {
		for (const [dependency, version] of this.dependencies) {
			dependency.get();

			if (dependency.getVersion() !== version) {
				return true;
			}
		}

		return false;
	}

	private recompute(): void {
		if (this.computing) {
			throw new Error('Cannot read a computed signal recursively.');
		}

		const previousActiveDependencyRecorder = getActiveDependencyRecorder();
		const previousActiveComputedSignal = getActiveComputedSignal();
		const previousValue = this.value;
		const previousError = this.error;
		const wasInitialized = this.initialized;
		let nextValue!: Value;
		let nextDependencies = new Map<DependencyNode, number>();
		let nextError: typeof COMPUTED_NO_ERROR | unknown = COMPUTED_NO_ERROR;

		this.computing = true;
		this.pendingDependencies = new Map();

		try {
			setActiveComputedSignal(this);
			setActiveDependencyRecorder((dependency) => {
				this.trackDependency(dependency);
			});
			nextValue = this.compute.call(this);
		} catch (error) {
			nextError = error;
		} finally {
			nextDependencies = this.pendingDependencies;
			setActiveComputedSignal(previousActiveComputedSignal);
			setActiveDependencyRecorder(previousActiveDependencyRecorder);
			this.pendingDependencies = new Map();
			this.computing = false;
		}

		this.dependencies = nextDependencies;
		this.stale = false;
		const hasChanged =
			!wasInitialized ||
			(nextError === COMPUTED_NO_ERROR
				? this.hasError || !this.equals.call(this, previousValue, nextValue)
				: !this.hasError || previousError !== nextError);

		if (nextError === COMPUTED_NO_ERROR) {
			this.value = nextValue;
			this.error = undefined;
			this.hasError = false;
		} else {
			this.error = nextError;
			this.hasError = true;
		}

		this.initialized = true;

		if (hasChanged) {
			this.version += 1;
		}

		if (this.subscribers.size > 0) {
			this.syncDependencySubscriptions();
		}

		if (this.getWatcherCount() > 0) {
			try {
				this.syncDependencyWatcherSubscriptions();
			} catch (error) {
				this.stale = true;
				throw error;
			}
		}
	}

	private refreshIfNeeded(): void {
		if (!this.initialized || this.stale || this.haveDependenciesChanged()) {
			this.recompute();
		}
	}

	private syncDependencySubscriptions(): void {
		for (const [dependency, unsubscribe] of this.dependencyUnsubscribers) {
			if (this.dependencies.has(dependency)) {
				continue;
			}

			unsubscribe();
			this.dependencyUnsubscribers.delete(dependency);
		}

		for (const dependency of this.dependencies.keys()) {
			if (this.dependencyUnsubscribers.has(dependency)) {
				continue;
			}

			this.dependencyUnsubscribers.set(dependency, dependency.subscribe(this.handleDependencyChange));
		}
	}

	/**
	 * Brings the dependency watchers in line with the current dependencies.
	 *
	 * @remarks
	 * If a dependency's `watched` hook throws, the dependencies added by this
	 * call are released in reverse order and the error is rethrown, so a failed
	 * first watch leaves nothing subscribed. Dependencies dropped by this call
	 * are released first and stay released; an error from their `unwatched` hooks
	 * is rethrown once the new dependencies are watched, and dropped if a `watched`
	 * hook throws, in favor of that error. A recompute that fails here leaves the
	 * computed stale, so the next read recomputes and retries the sync.
	 */
	private syncDependencyWatcherSubscriptions(): void {
		const dropped: (() => void)[] = [];

		for (const [dependency, unsubscribe] of this.dependencyWatcherUnsubscribers) {
			if (this.dependencies.has(dependency)) {
				continue;
			}

			dropped.push(unsubscribe);
			this.dependencyWatcherUnsubscribers.delete(dependency);
		}

		const droppedErrors = collectErrors(dropped);
		const added: (() => void)[] = [];

		try {
			for (const dependency of this.dependencies.keys()) {
				if (this.dependencyWatcherUnsubscribers.has(dependency)) {
					continue;
				}

				const unsubscribe = dependency.addWatcher(this.handleDependencyWatcherChange);

				this.dependencyWatcherUnsubscribers.set(dependency, unsubscribe);
				added.push(() => {
					this.dependencyWatcherUnsubscribers.delete(dependency);
					unsubscribe();
				});
			}
		} catch (error) {
			collectErrors(added.reverse());
			throw error;
		}

		throwCollected(droppedErrors);
	}

	private trackDependency(dependency: DependencyNode): void {
		this.pendingDependencies.set(dependency, dependency.getVersion());
	}

	protected override handleFirstWatcherAdded(): void {
		this.refreshIfNeeded();
		this.syncDependencyWatcherSubscriptions();
	}

	protected override handleLastWatcherRemoved(rollback: boolean): void {
		this.clearDependencyWatcherSubscriptions(rollback);
	}
}

/**
 * Creates a computed signal.
 *
 * This is equivalent to `new Computed(...)` and can be convenient in codebases
 * that prefer functional construction over classes.
 */
export function computed<Value>(
	computeValue: ComputedCallback<Value>,
	options?: SignalOptions<Value>,
): Computed<Value> {
	return new Computed(computeValue, options);
}

/**
 * Returns the computed signal currently being evaluated, if any.
 *
 * This is mainly useful inside advanced derived helpers that need access to
 * the active computed during dependency discovery.
 */
export function currentComputed(): Computed<unknown> | null {
	return currentComputedSignal();
}
