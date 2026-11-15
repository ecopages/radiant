import {
	bandPeak,
	litSegments,
	logBands,
	segmentBounds,
	stepPeak,
	type FrequencyBand,
	type Peak,
	type PeakTiming,
} from './audio-visualizer-bands';
import type { AudioFrame, AudioVisualizerPreset } from './audio-visualizer-controller';
import { createCanvasSurface, type CanvasSurface } from './audio-visualizer-canvas';

type BarsShared = {
	/** Frequency ranges in Hz, one per bar. Default: log-spaced from 60 Hz to 8 kHz, one per bar. */
	bands?: readonly FrequencyBand[];
	/** The lowest level a bar shows, 0 to 1. Default 0.12. */
	floor?: number;
	/** Analyser resolution; see `AudioVisualizerPreset.fftSize`. */
	fftSize?: number;
	/** Analyser smoothing; see `AudioVisualizerPreset.smoothing`. */
	smoothing?: number;
};

/** Writes each band's level to a bar element as the `--level` custom property. */
export type BarsDomOptions = BarsShared & {
	mode: 'dom';
	/** The bar elements inside the target. Default: its direct children. */
	selector?: string;
};

/** Draws vertical bars on a canvas created inside the target. */
export type BarsCanvasOptions = BarsShared & {
	mode: 'canvas';
	/** Bars when `bands` is not given. Default 24. */
	count?: number;
	/** A CSS custom property name (`--primary`) or any CSS color. Default `--primary`. */
	color?: string;
	/** The space between bars in CSS pixels. Default 2. */
	gap?: number;
	/** The space kept free around the bars inside the canvas, in CSS pixels. Default 0. */
	padding?: number;
	/** Splits each bar into this many LED segments, lit from the bottom. Default: a solid bar. */
	segments?: number;
	/** The space between segments in CSS pixels. Default 1. */
	segmentGap?: number;
	/** The shape of a bar's ends, and of each segment: `square` or `round` (a pill). Default `square`. */
	ends?: 'square' | 'round';
	/**
	 * The color at the top of each bar, in the format of `color`. The bars then fade from `color` at the bottom to
	 * this at the top. Default: one color.
	 */
	colorEnd?: string;
	/**
	 * A cap above each bar that holds its highest recent level, then falls. `hold` is in milliseconds, default 450;
	 * `fall` is in bar heights per second, default 1.2. Default: no caps.
	 */
	peaks?: Partial<PeakTiming>;
	/**
	 * What a preset at rest shows, from the moment it is mounted: `clear` draws nothing, `floor` draws the bars at
	 * their lowest level, with no caps, so a player at rest or under `prefers-reduced-motion` still shows them.
	 * Default `clear`.
	 */
	idle?: 'clear' | 'floor';
};

export type BarsOptions = BarsDomOptions | BarsCanvasOptions;

const DEFAULT_FLOOR = 0.12;

function domBars(options: BarsDomOptions): AudioVisualizerPreset {
	const floor = options.floor ?? DEFAULT_FLOOR;
	let target: HTMLElement | null = null;
	let found: { elements: HTMLElement[]; bands: readonly FrequencyBand[] } | null = null;
	const bars = () => {
		if (!target) {
			return { elements: [], bands: [] };
		}
		const elements = options.selector
			? Array.from(target.querySelectorAll<HTMLElement>(options.selector))
			: (Array.from(target.children) as HTMLElement[]);
		return { elements, bands: options.bands ?? logBands(elements.length) };
	};

	return {
		fftSize: options.fftSize,
		smoothing: options.smoothing,
		mount: (element) => {
			target = element;
			found = null;
		},
		draw(frame: AudioFrame) {
			found ??= bars();
			const { elements, bands } = found;
			elements.forEach((bar, index) => {
				const band = bands[index];
				if (!band) {
					bar.style.removeProperty('--level');
					return;
				}
				const level = Math.max(floor, bandPeak(frame.frequency, frame.sampleRate, frame.fftSize, band));
				bar.style.setProperty('--level', level.toFixed(3));
			});
		},
		rest() {
			bars().elements.forEach((bar) => bar.style.removeProperty('--level'));
			found = null;
		},
		destroy() {
			target = null;
			found = null;
		},
	};
}

const PEAK_HOLD = 450;
const PEAK_FALL = 1.2;
const SOLID_CAP_HEIGHT = 2;

function canvasBars(options: BarsCanvasOptions): AudioVisualizerPreset {
	const floor = options.floor ?? DEFAULT_FLOOR;
	const gap = options.gap ?? 2;
	const padding = options.padding ?? 0;
	const segments = options.segments ?? 0;
	const segmentGap = options.segmentGap ?? 1;
	const rounded = options.ends === 'round';
	const timing = options.peaks && { hold: options.peaks.hold ?? PEAK_HOLD, fall: options.peaks.fall ?? PEAK_FALL };
	const bands = options.bands ?? logBands(options.count ?? 24);
	const caps: Peak[] = bands.map(() => ({ value: 0, heldSince: 0 }));
	let surface: CanvasSurface | null = null;
	let resting = false;
	let lastFrame = 0;

	function fillRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
		context.beginPath();
		context.roundRect(x, y, width, height, rounded ? Math.min(width, height) / 2 : 0);
		context.fill();
	}

	function paintBar(
		context: CanvasRenderingContext2D,
		x: number,
		width: number,
		level: number,
		top: number,
		height: number,
	) {
		if (!segments) {
			const barHeight = level * height;
			fillRect(context, x, top + height - barHeight, width, barHeight);
			return;
		}
		for (let index = 0; index < litSegments(level, segments); index++) {
			const bounds = segmentBounds(index, segments, segmentGap, top, height);
			fillRect(context, x, bounds.y, width, bounds.height);
		}
	}

	function paintCap(
		context: CanvasRenderingContext2D,
		x: number,
		width: number,
		level: number,
		top: number,
		height: number,
	) {
		if (segments) {
			const bounds = segmentBounds(
				Math.max(0, litSegments(level, segments) - 1),
				segments,
				segmentGap,
				top,
				height,
			);
			fillRect(context, x, bounds.y, width, bounds.height);
		} else {
			fillRect(context, x, top + height - level * height - SOLID_CAP_HEIGHT, width, SOLID_CAP_HEIGHT);
		}
	}

	function render(levels: readonly number[], capped: boolean) {
		if (!surface) {
			throw new Error('bars: draw() ran before mount()');
		}
		const canvas = surface;
		const { context, width, height } = canvas;
		canvas.clear();
		const innerWidth = width - padding * 2;
		const innerHeight = height - padding * 2;
		const bottom = canvas.resolveColor(options.color ?? '--primary');
		if (options.colorEnd) {
			const gradient = context.createLinearGradient(0, padding + innerHeight, 0, padding);
			gradient.addColorStop(0, bottom);
			gradient.addColorStop(1, canvas.resolveColor(options.colorEnd));
			context.fillStyle = gradient;
		} else {
			context.fillStyle = bottom;
		}
		const barWidth = Math.max(1, (innerWidth - gap * (levels.length - 1)) / levels.length);
		levels.forEach((level, index) => {
			const x = padding + index * (barWidth + gap);
			paintBar(context, x, barWidth, level, padding, innerHeight);
			if (capped) paintCap(context, x, barWidth, caps[index].value, padding, innerHeight);
		});
	}

	function paintFloor() {
		render(
			bands.map(() => floor),
			false,
		);
	}

	return {
		fftSize: options.fftSize,
		smoothing: options.smoothing,
		mount: (element) => {
			surface = createCanvasSurface(element, () => {
				if (resting && surface) paintFloor();
			});
			resting = options.idle === 'floor';
			if (resting) paintFloor();
		},
		draw(frame: AudioFrame) {
			resting = false;
			const now = performance.now();
			const elapsed = lastFrame ? now - lastFrame : 0;
			lastFrame = now;
			const levels = bands.map((band) =>
				Math.max(floor, bandPeak(frame.frequency, frame.sampleRate, frame.fftSize, band)),
			);
			if (timing) levels.forEach((level, index) => stepPeak(caps[index], level, now, elapsed, timing));
			render(levels, timing !== undefined);
		},
		rest() {
			lastFrame = 0;
			caps.forEach((cap) => Object.assign(cap, { value: 0, heldSince: 0 }));
			if (options.idle === 'floor' && surface) {
				resting = true;
				render(
					bands.map(() => floor),
					false,
				);
			} else {
				surface?.clear();
			}
		},
		destroy() {
			surface?.destroy();
			surface = null;
			resting = false;
		},
	};
}

/**
 * Bars that follow the loudness of frequency bands, as elements or on a canvas.
 *
 * @remarks
 * `dom` mode owns no markup: it writes `--level` (0 to 1) on the bar elements the host rendered, for the host's
 * CSS to scale or fade (`transform: scaleY(var(--level, 0.12))`), and removes it on rest. With no `bands`, each
 * element gets one of as many log-spaced bands as there are elements, so four elements give four bands. An element
 * beyond the given `bands` is left without a level. `dom` mode finds the elements when drawing starts, and again
 * after each rest, not on every frame, so add bars while the media is paused. `canvas` mode creates a canvas that
 * fills the target, so give it a height and no other content. Bars follow the bands low to high. The canvas look is
 * set by `segments` (LED blocks), `ends`, `colorEnd` (a gradient), `peaks` (caps that hold, then fall) and `idle`; a
 * preset under `prefers-reduced-motion` is never drawn by the controller, so `idle: 'floor'` is what keeps the bars
 * visible there.
 *
 * @example
 * ```ts
 * bars({ mode: 'dom', selector: '[data-bar]' });
 * bars({ mode: 'canvas', count: 32, color: '--primary' });
 * bars({ mode: 'canvas', count: 40, segments: 10, peaks: {}, colorEnd: '--secondary', idle: 'floor' });
 * ```
 */
export function bars(options: BarsOptions): AudioVisualizerPreset {
	return options.mode === 'dom' ? domBars(options) : canvasBars(options);
}
