export type CarouselAutoplayConfig = {
	getInterval: () => number;
	canRotate: () => boolean;
	onTick: () => void;
	/** Called after the timer starts or stops so the host can sync live-region state. */
	onRunningChange: () => void;
};

/**
 * Interval rotation for a carousel host.
 *
 * @remarks Pause policy, reduced motion, and wrap live on the host. This
 * controller only owns the timer.
 */
export class CarouselAutoplay {
	private timer: ReturnType<typeof setInterval> | null = null;

	constructor(private readonly config: CarouselAutoplayConfig) {}

	get isRunning(): boolean {
		return this.timer !== null;
	}

	start(): void {
		if (!this.config.canRotate()) {
			this.stop();
			return;
		}

		this.stop();
		const ms = Math.max(0, this.config.getInterval());
		this.timer = setInterval(() => {
			if (!this.config.canRotate()) {
				this.stop();
				return;
			}

			this.config.onTick();
		}, ms);
		this.config.onRunningChange();
	}

	stop(): void {
		if (this.timer === null) return;
		clearInterval(this.timer);
		this.timer = null;
		this.config.onRunningChange();
	}

	sync(): void {
		if (this.config.canRotate()) {
			this.start();
		} else {
			this.stop();
		}
	}
}
