export type RenderSchedulerOptions = {
	canFlush: () => boolean;
	commit: () => void;
};

/**
 * Coalesces microtask-scheduled render commits for reactive hosts.
 */
export class RenderScheduler {
	private needsRender = false;
	private isRendering = false;
	private isRenderScheduled = false;

	constructor(private readonly options: RenderSchedulerOptions) {}

	public get rendering(): boolean {
		return this.isRendering;
	}

	public get pending(): boolean {
		return this.needsRender;
	}

	public markPending(): void {
		this.needsRender = true;
	}

	public clearPending(): void {
		this.needsRender = false;
	}

	public requestUpdate(): void {
		this.needsRender = true;

		if (this.isRenderScheduled) {
			return;
		}

		this.isRenderScheduled = true;

		queueMicrotask(() => {
			this.isRenderScheduled = false;

			if (!this.needsRender) {
				return;
			}

			this.flush();
		});
	}

	public flush(): void {
		if (!this.options.canFlush()) {
			return;
		}

		while (this.needsRender && this.options.canFlush()) {
			this.needsRender = false;
			this.runCommit();
		}
	}

	public runExclusive<T>(work: () => T): T {
		this.isRendering = true;

		try {
			return work();
		} finally {
			this.isRendering = false;
		}
	}

	private runCommit(): void {
		this.isRendering = true;

		try {
			this.options.commit();
		} finally {
			this.isRendering = false;
		}
	}
}
