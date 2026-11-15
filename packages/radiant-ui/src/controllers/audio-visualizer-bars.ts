import {
	bandPeak,
	barBounds,
	litSegments,
	logBands,
	segmentBounds,
	shapeLevel,
	stepGain,
	stepPeak,
	type BarShape,
	type FrequencyBand,
	type Gain,
	type LevelShape,
	type Peak,
	type PeakTiming,
	type Rect,
} from './audio-visualizer-bands';
import type { AudioFrame, AudioVisualizerPreset } from './audio-visualizer-controller';
import { createCanvasSurface, type CanvasSurface } from './audio-visualizer-canvas';

type BarsShared = {
	/** Frequency ranges in Hz, one per bar. Default: log-spaced from 60 Hz to 8 kHz, one per bar. */
	bands?: readonly FrequencyBand[];
	/**
	 * The lowest level a solid or `dom` bar shows, 0 to 1, so a quiet band still has a stub. Default 0.12. Segmented
	 * bars ignore it: a band that is off lights no segment.
	 */
	floor?: number;
	/**
	 * The analyser level, 0 to 1, at or below which a band is off. Set it just above the noise of the media so
	 * quiet bands show nothing. Default 0.
	 */
	floorLevel?: number;
	/** The analyser span above `floorLevel` that fills the bar, so a smaller range reaches the top sooner. Default 1. */
	range?: number;
	/** An exponent on the scaled level: above 1 pushes quiet bands down and keeps peaks high. Default 1. */
	curve?: number;
	/**
	 * Scales against the loudest band of the last moments instead of `range`, so a quiet track still reaches the
	 * top. The value is how fast that running maximum falls, in full scales per second; 0.2 is slow. Default: off.
	 */
	adapt?: number;
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
	/**
	 * The bar style. `led`: LED segments (see `segments`). `solid`: continuous bars with rounded tops. `line`: thin
	 * hairline bars (see `lineWidth`) with wide gaps. `mirror`: continuous bars that grow up and down from the middle.
	 * Every variant takes the same level shaping. The three continuous variants have no minimum height, so a quiet
	 * band is not drawn, and at rest `idle: 'floor'` draws one dim hairline. Default: `led` when `segments` is set,
	 * otherwise the plain solid bar of earlier versions (square ends, a `floor` minimum).
	 */
	variant?: BarsVariant;
	/** The width of a `line` bar in CSS pixels. Default 2. */
	lineWidth?: number;
	/** Splits each bar into this many LED segments, lit from the bottom. Default 12 for `variant: 'led'`. */
	segments?: number;
	/** The space between segments in CSS pixels. Default 1. */
	segmentGap?: number;
	/**
	 * The shape of a bar's ends, and of each segment: `square` or `round`. A round continuous bar has rounded tops
	 * (both ends for `mirror`), an LED segment a pill. Default `round` for `variant: 'solid'` and `'mirror'`,
	 * otherwise `square`.
	 */
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
	 * What a preset at rest shows, from the moment it is mounted: `clear` draws nothing, `floor` draws a baseline,
	 * with no caps, so a player at rest or under `prefers-reduced-motion` still shows the bars: segmented bars show
	 * only their lowest segment, dimmed; solid bars show their `floor` height. Default `clear`.
	 */
	idle?: 'clear' | 'floor';
};

/** The look of canvas bars; see `BarsCanvasOptions.variant`. */
export type BarsVariant = 'led' | 'solid' | 'line' | 'mirror';

export type BarsOptions = BarsDomOptions | BarsCanvasOptions;

const DEFAULT_FLOOR = 0.12;
const IDLE_SEGMENT_ALPHA = 0.3;

function shapeOf(options: BarsShared): LevelShape {
	return { floorLevel: options.floorLevel ?? 0, range: options.range ?? 1, curve: options.curve ?? 1 };
}

/** Shapes the raw level of every band into `out` (a new array when not given); `gain` is the running maximum. */
function shapedLevels(
	raw: readonly number[],
	shape: LevelShape,
	gain: Gain,
	adapt: number | undefined,
	elapsed: number,
	out: number[] = [],
): number[] {
	if (adapt !== undefined) {
		let loudest = 0;
		for (const level of raw) loudest = Math.max(loudest, level);
		stepGain(gain, loudest, elapsed, adapt);
	}
	raw.forEach((level, index) => {
		out[index] = shapeLevel(level, shape, adapt === undefined ? undefined : gain.top);
	});
	return out;
}

function domBars(options: BarsDomOptions): AudioVisualizerPreset {
	const floor = options.floor ?? DEFAULT_FLOOR;
	const shape = shapeOf(options);
	const gain: Gain = { top: 0 };
	let lastFrame = 0;
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
			const now = performance.now();
			const elapsed = lastFrame ? now - lastFrame : 0;
			lastFrame = now;
			const levels = shapedLevels(
				bands.map((band) => bandPeak(frame.frequency, frame.sampleRate, frame.fftSize, band)),
				shape,
				gain,
				options.adapt,
				elapsed,
			);
			elements.forEach((bar, index) => {
				if (!bands[index]) {
					bar.style.removeProperty('--level');
					return;
				}
				bar.style.setProperty('--level', Math.max(floor, levels[index]).toFixed(3));
			});
		},
		rest() {
			bars().elements.forEach((bar) => bar.style.removeProperty('--level'));
			found = null;
			lastFrame = 0;
			gain.top = 0;
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
const LED_SEGMENTS = 12;
const LINE_WIDTH = 2;
const HAIRLINE = 1;

/** The variant and the defaults that depend on it, resolved once from the options. */
function resolveLook(options: BarsCanvasOptions) {
	const explicit = options.variant;
	const variant: BarsVariant = explicit ?? (options.segments ? 'led' : 'solid');
	const segments = variant === 'led' ? (options.segments ?? LED_SEGMENTS) : 0;
	return {
		explicit,
		variant,
		segments,
		floor: explicit || segments ? 0 : (options.floor ?? DEFAULT_FLOOR),
		gap: options.gap ?? (variant === 'line' ? 6 : 2),
		ends: options.ends ?? (explicit === 'solid' || explicit === 'mirror' ? 'round' : 'square'),
		lineWidth: options.lineWidth ?? LINE_WIDTH,
	};
}

function canvasBars(options: BarsCanvasOptions): AudioVisualizerPreset {
	const { explicit, variant, segments, floor, gap, ends, lineWidth } = resolveLook(options);
	const shape = shapeOf(options);
	const gain: Gain = { top: 0 };
	const padding = options.padding ?? 0;
	const segmentGap = options.segmentGap ?? 1;
	const rounded = ends === 'round';
	const timing = options.peaks && { hold: options.peaks.hold ?? PEAK_HOLD, fall: options.peaks.fall ?? PEAK_FALL };
	const bands = options.bands ?? logBands(options.count ?? 24);
	const caps: Peak[] = bands.map(() => ({ value: 0, heldSince: 0 }));
	const levels: number[] = bands.map(() => 0);
	const raw: number[] = bands.map(() => 0);
	const rect: Rect = { x: 0, y: 0, width: 0, height: 0 };
	const radii = [0, 0, 0, 0];
	let surface: CanvasSurface | null = null;
	let resting = false;
	let lastFrame = 0;

	function fillRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
		context.beginPath();
		context.roundRect(x, y, width, height, rounded ? Math.min(width, height) / 2 : 0);
		context.fill();
	}

	function fillBar(context: CanvasRenderingContext2D, bar: Rect) {
		if (bar.height <= 0) return;
		const radius = rounded ? Math.min(bar.width, bar.height) / 2 : 0;
		const bottom = variant === 'mirror' || !explicit ? radius : 0;
		radii[0] = radius;
		radii[1] = radius;
		radii[2] = bottom;
		radii[3] = bottom;
		context.beginPath();
		context.roundRect(bar.x, bar.y, bar.width, bar.height, radii);
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
			fillBar(context, barBounds(rect, variant as BarShape, level, x, width, lineWidth, top, height));
			return;
		}
		const lit = litSegments(level, segments);
		for (let index = 0; index < lit; index++) {
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
			const lit = litSegments(level, segments);
			if (lit === 0) return;
			const bounds = segmentBounds(lit - 1, segments, segmentGap, top, height);
			fillRect(context, x, bounds.y, width, bounds.height);
			return;
		}
		if (level <= 0) return;
		barBounds(rect, variant as BarShape, level, x, width, lineWidth, top, height);
		const clearance = explicit ? 1 : 0;
		context.fillRect(rect.x, rect.y - SOLID_CAP_HEIGHT - clearance, rect.width, SOLID_CAP_HEIGHT);
		if (variant === 'mirror') {
			context.fillRect(rect.x, rect.y + rect.height + clearance, rect.width, SOLID_CAP_HEIGHT);
		}
	}

	function render(levels: readonly number[], capped: boolean, alpha = 1) {
		if (!surface) {
			throw new Error('bars: draw() ran before mount()');
		}
		const canvas = surface;
		const { context, width, height } = canvas;
		canvas.clear();
		context.globalAlpha = alpha;
		const innerWidth = width - padding * 2;
		const innerHeight = height - padding * 2;
		const bottom = canvas.resolveColor(options.color ?? '--primary');
		if (options.colorEnd) {
			const gradient = context.createLinearGradient(0, padding + innerHeight, 0, padding);
			const end = canvas.resolveColor(options.colorEnd);
			if (variant === 'mirror') {
				gradient.addColorStop(0, end);
				gradient.addColorStop(0.5, bottom);
				gradient.addColorStop(1, end);
			} else {
				gradient.addColorStop(0, bottom);
				gradient.addColorStop(1, end);
			}
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
		context.globalAlpha = 1;
	}

	function paintFloor() {
		if (!surface) return;
		const baseline = segments ? 0.5 / segments : explicit ? HAIRLINE / (surface.height - padding * 2) : floor;
		levels.fill(baseline);
		render(levels, false, segments || explicit ? IDLE_SEGMENT_ALPHA : 1);
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
			bands.forEach((band, index) => {
				raw[index] = bandPeak(frame.frequency, frame.sampleRate, frame.fftSize, band);
			});
			shapedLevels(raw, shape, gain, options.adapt, elapsed, levels);
			levels.forEach((level, index) => {
				levels[index] = Math.max(floor, level);
				if (timing) stepPeak(caps[index], levels[index], now, elapsed, timing);
			});
			render(levels, timing !== undefined);
		},
		rest() {
			lastFrame = 0;
			gain.top = 0;
			caps.forEach((cap) => Object.assign(cap, { value: 0, heldSince: 0 }));
			if (options.idle === 'floor' && surface) {
				resting = true;
				paintFloor();
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
 * The level of a band is the analyser's byte as 0 to 1, shaped by `floorLevel`, `range` and `curve` (`adapt` makes
 * the top follow the loudest recent band). The analyser's decibel scale is loud: music rarely drops under 0.2 and
 * its peaks clip at 1, so with the defaults every band sits high and moves little. Raise `floorLevel` to just above
 * the noise of the media and use a `curve` above 1 for bars that go to nothing in the gaps of the sound. A solid or
 * `dom` bar is never lower than `floor`; a segmented bar can be empty.
 *
 * @example
 * ```ts
 * bars({ mode: 'dom', selector: '[data-bar]' });
 * bars({ mode: 'canvas', count: 32, color: '--primary' });
 * bars({ mode: 'canvas', count: 40, segments: 10, peaks: {}, colorEnd: '--secondary', idle: 'floor' });
 * bars({ mode: 'canvas', count: 40, segments: 14, floorLevel: 0.3, range: 0.7, curve: 1.6 });
 * ```
 */
export function bars(options: BarsOptions): AudioVisualizerPreset {
	return options.mode === 'dom' ? domBars(options) : canvasBars(options);
}
