import { Computed, subtle } from '@ecopages/signals';
import type { RenderWarnings } from './render-warnings';

/** Tracks a host render and schedules its next update when a dependency changes. */
export class TrackedRender<Value> {
	private signal?: Computed<Value>;
	private watching = false;
	private refreshed = false;
	private readonly watcher: InstanceType<typeof subtle.Watcher>;

	constructor(
		private readonly requestUpdate: () => void,
		private readonly warnings?: RenderWarnings,
	) {
		this.watcher = new subtle.Watcher(requestUpdate);
	}

	/**
	 * @remarks Reuses the output that {@link reconnect} already computed instead of rendering again.
	 * A new render computation is watched before the previous one is unwatched, so a dependency both read keeps its
	 * `watched` hook state instead of being released and re-acquired on every render.
	 */
	public evaluate(render: () => Value, connected: boolean): Value {
		if (this.refreshed && connected && this.signal) {
			this.refreshed = false;
			const value = this.signal.get();
			this.watcher.watch(this.signal);
			return value;
		}

		const warnings = this.warnings;
		const signal = new Computed(warnings ? () => warnings.run(render) : render);
		const value = signal.get();
		if (connected) {
			const previous = this.watching ? this.signal : undefined;
			this.watcher.watch(signal);
			this.signal = signal;
			this.watching = true;
			this.refreshed = false;
			if (previous) this.watcher.unwatch(previous);
		}
		return value;
	}

	/**
	 * @remarks A reconnect can preserve the DOM without rendering, so restore its previous dependency watch.
	 * Watching refreshes the computed, which reruns the render only when a dependency changed while detached.
	 */
	public reconnect(): void {
		if (!this.signal || this.watching) return;
		const previousVersion = this.signal.getVersion();
		this.watcher.watch(this.signal);
		this.watching = true;
		if (this.signal.getVersion() !== previousVersion) {
			this.refreshed = true;
			this.requestUpdate();
		}
	}

	public disconnect(): void {
		this.refreshed = false;
		if (!this.signal || !this.watching) return;
		this.watcher.unwatch(this.signal);
		this.watching = false;
	}
}
