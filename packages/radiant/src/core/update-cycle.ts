export type UpdateCycleOptions = {
	/** Whether queued work may run now (connected host past its first-connect sync). */
	canFlush: () => boolean;
	/** Runs batched `@onUpdated` callbacks for one set of changed members. */
	runCallbacks: (changed: ReadonlySet<string>) => void;
	/** Commits the host render. */
	commit: () => void;
	/** Runs after the cycle's callbacks and commit, with every member that changed in it. */
	updated: (changed: ReadonlySet<string>) => void;
};

type Completion = { promise: Promise<void>; resolve: () => void; reject: (error: unknown) => void };

/** Bounds member writes that keep re-triggering their own callbacks within one flush. */
const MAX_ROUNDS = 100;

/**
 * One batched update cycle per host: member changes and render requests made
 * in the same turn flush together in a single microtask.
 *
 * @remarks
 * A flush runs `@onUpdated` callbacks once per method for everything that
 * changed, then commits the render if one is pending, repeating while those
 * steps queue more work, and finally calls `updated(changed)` and resolves
 * {@link updateComplete}. Nothing runs while {@link UpdateCycleOptions.canFlush}
 * is false; changes accumulate until the host connects. SSR drains callbacks
 * explicitly with {@link runCallbacks}.
 *
 * A flush that throws drops its changed set and rejects {@link updateComplete}.
 * Work run from a microtask ({@link defer} or a scheduled flush) reports its
 * error through that rejection when a caller is awaiting it, and as an uncaught
 * error otherwise.
 */
export class UpdateCycle {
	#changed = new Set<string>();
	#cycleChanged = new Set<string>();
	#renderPending = false;
	#rendering = false;
	#flushing = false;
	#scheduled = false;
	#didWork = false;
	#deferred = 0;
	#completion?: Completion;

	constructor(private readonly options: UpdateCycleOptions) {}

	public get rendering(): boolean {
		return this.#rendering;
	}

	public get renderPending(): boolean {
		return this.#renderPending;
	}

	/**
	 * Resolves once no member change or render is pending and the last flush has finished.
	 *
	 * @remarks Stays pending while the host is disconnected with queued work, and
	 * rejects when the flush it waits for throws.
	 */
	public get updateComplete(): Promise<void> {
		if (this.#isIdle()) {
			return Promise.resolve();
		}

		if (!this.#completion) {
			let resolve!: () => void;
			let reject!: (error: unknown) => void;
			const promise = new Promise<void>((done, fail) => {
				resolve = done;
				reject = fail;
			});
			this.#completion = { promise, resolve, reject };
		}

		return this.#completion.promise;
	}

	/**
	 * Runs `work` in a microtask, keeping {@link updateComplete} pending until it finishes.
	 *
	 * @remarks Hosts defer their connect sync this way, so awaiting callers see the first render.
	 */
	public defer(work: () => void): void {
		this.#deferred += 1;
		queueMicrotask(() => {
			try {
				this.#runReported(work);
			} finally {
				this.#deferred -= 1;
				this.#resolveIfIdle();
			}
		});
	}

	public markChanged(key: string): void {
		this.#changed.add(key);
		this.#schedule();
	}

	public requestRender(): void {
		this.#renderPending = true;
		this.#schedule();
	}

	/**
	 * Drains queued member changes through the batched callbacks without committing.
	 *
	 * @remarks Ignores `canFlush`, so SSR and first-connect sync can run callbacks
	 * before the host renders.
	 */
	public runCallbacks(): void {
		let rounds = 0;

		while (this.#changed.size > 0) {
			assertBounded(++rounds);
			const batch = this.#changed;
			this.#changed = new Set();

			for (const key of batch) {
				this.#cycleChanged.add(key);
			}

			this.#didWork = true;
			this.options.runCallbacks(batch);
		}
	}

	/**
	 * Commits the pending render now, unless a commit is already running or the host cannot flush.
	 *
	 * @param work - Replaces the render commit, e.g. with a first-connect hydration.
	 */
	public commit(work: () => void = this.options.commit): void {
		if (this.#rendering || !this.options.canFlush()) {
			return;
		}

		this.#renderPending = false;
		this.#rendering = true;

		try {
			work();
		} finally {
			this.#rendering = false;
		}

		this.#didWork = true;
	}

	/**
	 * Runs the cycle now, or commits a requested render when called from inside a running flush.
	 *
	 * @remarks Inside a flush, the running flush still owns callbacks and `updated()`.
	 */
	public update(): void {
		if (!this.#flushing) {
			this.flush();
			return;
		}

		if (this.#renderPending) {
			this.commit();
		}
	}

	/**
	 * Runs everything queued: callbacks, commit, then `updated(changed)`.
	 *
	 * @param work - Host work that belongs to this cycle, such as the connect
	 * sync; it runs first, inside the flush.
	 *
	 * @remarks Re-entrant calls (from a callback or `updated`) are ignored; the
	 * running flush picks up their work, and work queued by `updated` schedules
	 * the next cycle.
	 */
	public flush(work?: () => void): void {
		if (this.#flushing || !this.options.canFlush()) {
			return;
		}

		this.#flushing = true;

		try {
			let rounds = 0;
			work?.();
			this.runCallbacks();

			while (this.#renderPending && !this.#rendering && this.options.canFlush()) {
				assertBounded(++rounds);
				this.commit();
				this.runCallbacks();
			}

			if (this.#didWork) {
				const changed = this.#cycleChanged;
				this.#cycleChanged = new Set();
				this.#didWork = false;
				this.options.updated(changed);
			}
		} catch (error) {
			this.#cycleChanged = new Set();
			this.#didWork = false;
			this.#rejectCompletion(error);
			throw error;
		} finally {
			this.#flushing = false;
		}

		this.#resolveIfIdle();
	}

	#isIdle(): boolean {
		return (
			this.#deferred === 0 &&
			!this.#flushing &&
			!this.#scheduled &&
			!this.#renderPending &&
			this.#changed.size === 0
		);
	}

	#resolveIfIdle(): void {
		if (this.#isIdle() && this.#completion) {
			const { resolve } = this.#completion;
			this.#completion = undefined;
			resolve();
		}
	}

	#rejectCompletion(error: unknown): void {
		const completion = this.#completion;
		this.#completion = undefined;
		completion?.reject(error);
	}

	/** Runs microtask work, leaving an error to awaiting callers when there are any. */
	#runReported(work: () => void): void {
		const awaited = this.#completion !== undefined;

		try {
			work();
		} catch (error) {
			this.#rejectCompletion(error);

			if (!awaited) {
				throw error;
			}
		}
	}

	#schedule(): void {
		if (this.#scheduled) {
			return;
		}

		this.#scheduled = true;
		queueMicrotask(() => {
			this.#scheduled = false;
			this.#runReported(() => this.flush());
		});
	}
}

function assertBounded(rounds: number): void {
	if (rounds > MAX_ROUNDS) {
		throw new Error(
			`[@ecopages/radiant] Update cycle did not settle after ${MAX_ROUNDS} rounds. An @onUpdated callback or render keeps changing reactive state.`,
		);
	}
}
