export type CarouselAutoplayConfig = {
	getInterval: () => number;
	canRotate: () => boolean;
	onTick: () => void;
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
	}

	stop(): void {
		if (this.timer) {
			clearInterval(this.timer);
		}

		this.timer = null;
	}

	sync(): void {
		if (this.config.canRotate()) {
			this.start();
		} else {
			this.stop();
		}
	}
}
