import type { AudioFrame, AudioVisualizerPreset } from './audio-visualizer-controller';
import { createCanvasSurface, type CanvasSurface } from './audio-visualizer-canvas';

/** The look of a `wave` preset. */
export type WaveOptions = {
	/** In CSS pixels. Default 2. */
	lineWidth?: number;
	/** Also fills between the line and the middle, faintly. Default `false`. */
	fill?: boolean;
	/** A CSS custom property name (`--primary`) or any CSS color. Default `--primary`. */
	color?: string;
	/** The space kept free around the wave inside the canvas, in CSS pixels. Default 0. */
	padding?: number;
	/** Analyser resolution; see `AudioVisualizerPreset.fftSize`. Default 2048. */
	fftSize?: number;
	/** Analyser smoothing; see `AudioVisualizerPreset.smoothing`. */
	smoothing?: number;
};

const FILL_ALPHA = 0.18;

/**
 * The waveform of the sound as a smooth line on a canvas created inside the target.
 *
 * @remarks
 * The canvas fills the target, so give it a height and no other content. A sample above the center
 * (positive amplitude) is drawn higher. The line has a point every other pixel at most, joined by quadratic curves
 * through the midpoints of the samples. `draw()` before `mount()` throws.
 *
 * @example
 * ```ts
 * wave({ lineWidth: 3, fill: true, color: '--primary' });
 * ```
 */
export function wave(options: WaveOptions = {}): AudioVisualizerPreset {
	let surface: CanvasSurface | null = null;

	return {
		fftSize: options.fftSize ?? 2048,
		smoothing: options.smoothing,
		mount: (element) => {
			surface = createCanvasSurface(element);
		},
		draw({ waveform }: AudioFrame) {
			if (!surface) {
				throw new Error('wave: draw() ran before mount()');
			}
			const canvas = surface;
			const { context, width, height } = canvas;
			canvas.clear();
			const padding = options.padding ?? 0;
			const innerWidth = width - padding * 2;
			const innerHeight = height - padding * 2;
			const points = Math.max(3, Math.min(waveform.length, Math.ceil(innerWidth / 2)));
			const stride = waveform.length / points;
			const xAt = (index: number) => padding + (index / (points - 1)) * innerWidth;
			const yAt = (index: number) => padding + (1 - waveform[Math.floor(index * stride)] / 255) * innerHeight;

			context.beginPath();
			context.moveTo(padding, yAt(0));
			for (let index = 1; index < points - 1; index++) {
				const midX = (xAt(index) + xAt(index + 1)) / 2;
				const midY = (yAt(index) + yAt(index + 1)) / 2;
				context.quadraticCurveTo(xAt(index), yAt(index), midX, midY);
			}
			context.lineTo(xAt(points - 1), yAt(points - 1));

			const color = canvas.resolveColor(options.color ?? '--primary');
			context.lineWidth = options.lineWidth ?? 2;
			context.lineJoin = 'round';
			context.strokeStyle = color;
			context.stroke();
			if (options.fill) {
				context.lineTo(xAt(points - 1), height / 2);
				context.lineTo(padding, height / 2);
				context.closePath();
				context.globalAlpha = FILL_ALPHA;
				context.fillStyle = color;
				context.fill();
				context.globalAlpha = 1;
			}
		},
		rest: () => surface?.clear(),
		destroy() {
			surface?.destroy();
			surface = null;
		},
	};
}
