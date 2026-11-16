import { Computed, peek, subtle } from '@ecopages/signals';

/** Tracks a host render and schedules its next update when a dependency changes. */
export class TrackedRender<Value> {
	private signal?: Computed<Value>;
	private watching = false;
	private readonly watcher: InstanceType<typeof subtle.Watcher>;

	constructor(private readonly requestUpdate: () => void) {
		this.watcher = new subtle.Watcher(requestUpdate);
	}

	public evaluate(render: () => Value, connected: boolean): Value {
		const signal = new Computed(render);
		const value = signal.get();
		if (connected) {
			this.disconnect();
			this.signal = signal;
			this.watcher.watch(signal);
			this.watching = true;
		}
		return value;
	}

	/** @remarks A reconnect can preserve the DOM without rendering, so restore its previous dependency watch. */
	public reconnect(): void {
		if (!this.signal || this.watching) return;
		const previousVersion = this.signal.getVersion();
		peek(this.signal);
		this.watcher.watch(this.signal);
		this.watching = true;
		if (this.signal.getVersion() !== previousVersion) this.requestUpdate();
	}

	public disconnect(): void {
		if (!this.signal || !this.watching) return;
		this.watcher.unwatch(this.signal);
		this.watching = false;
	}
}
