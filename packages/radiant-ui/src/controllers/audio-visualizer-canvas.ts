import { ResizeController } from './resize-controller';

/** A canvas in a target that follows the target's size and the device pixel ratio. */
export interface CanvasSurface {
	readonly context: CanvasRenderingContext2D;
	/** Width in CSS pixels. */
	readonly width: number;
	/** Height in CSS pixels. */
	readonly height: number;
	clear(): void;
	/** The color for `color`, read now from the canvas so it follows the active theme. */
	resolveColor(color: string): string;
	destroy(): void;
}

/**
 * Creates a decorative canvas in `target` that fills its content box, and keeps its pixel size in step with the
 * canvas's own box and with the device pixel ratio (browser zoom, another screen).
 *
 * @remarks
 * Give the target a height and no other content: the canvas is appended after what is there. Resizing clears a
 * canvas, so a preset redraws on its next frame. A property that is not defined falls back to the canvas's
 * text `color`, and a canvas that is not in the document has no style, so it resolves to `transparent`, which is what a
 * preset resting on the way out draws. `color` is a CSS custom property name
 * (`--primary`) or any CSS color; a property is read on every call, not once, because a theme or light and dark
 * switch changes it while the audio plays. `onResize` runs after each resize, which has cleared the canvas, for a
 * preset that shows something at rest.
 */
export function createCanvasSurface(target: HTMLElement, onResize?: () => void): CanvasSurface {
	const canvas = document.createElement('canvas');
	canvas.setAttribute('aria-hidden', 'true');
	canvas.style.display = 'block';
	canvas.style.width = '100%';
	canvas.style.height = '100%';
	target.append(canvas);
	const context = canvas.getContext('2d')!;

	const size = { width: 0, height: 0 };
	const fit = () => {
		const ratio = window.devicePixelRatio;
		size.width = canvas.clientWidth;
		size.height = canvas.clientHeight;
		canvas.width = Math.round(size.width * ratio);
		canvas.height = Math.round(size.height * ratio);
		context.setTransform(ratio, 0, 0, ratio, 0, 0);
		onResize?.();
	};
	fit();
	const resize = new ResizeController({ getTargets: () => [canvas], onResize: fit });
	resize.attach();

	let ratioQuery: MediaQueryList | null = null;
	const watchRatio = () => {
		ratioQuery?.removeEventListener('change', onRatio);
		ratioQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
		ratioQuery.addEventListener('change', onRatio);
	};
	const onRatio = () => {
		fit();
		watchRatio();
	};
	watchRatio();

	return {
		context,
		get width() {
			return size.width;
		},
		get height() {
			return size.height;
		},
		clear: () => context.clearRect(0, 0, size.width, size.height),
		resolveColor: (color) => {
			if (!color.startsWith('--')) {
				return color;
			}
			const style = getComputedStyle(canvas);
			return style.getPropertyValue(color).trim() || style.color || 'transparent';
		},
		destroy() {
			resize.destroy();
			ratioQuery?.removeEventListener('change', onRatio);
			canvas.remove();
		},
	};
}
