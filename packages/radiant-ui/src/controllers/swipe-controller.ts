import { bindController, type Controller, type ControllerHost } from './controller';
import { PointerDragController } from './pointer-drag-controller';
import { resolveSwipeDirection, type SwipeDirection, type SwipeOptions } from './swipe-direction';

/** The target, thresholds and callback of a `SwipeController`. */
export type SwipeControllerConfig = SwipeOptions & {
	/** Resolved on every `attach()`; `null` listens to nothing. */
	getTarget: () => HTMLElement | null;
	/** Limits gestures to this element's subtree, resolved on every press; see `PointerDragControllerConfig.getHandle`. */
	getHandle?: () => Element | null;
	/** A gesture that starts on a target this returns `true` for is ignored, such as a button inside the surface. */
	exclude?: (target: EventTarget | null) => boolean;
	/** Called on the pointer-up that ends a swipe, with the direction of travel from the press point. */
	onSwipe: (direction: SwipeDirection, event: PointerEvent) => void;
};

/**
 * Reports a swipe on an element: a primary-button press, travel past a threshold, and a release.
 *
 * @remarks
 * Built on `PointerDragController` with capture off: the press, the single followed pointer and the end are its,
 * and its listeners sit on `document`, so a release outside the element still ends the gesture. Reports once, on
 * release; it does not follow the pointer. A surface that moves with the pointer or decides on speed (the toast)
 * needs a `PointerDragController`. A pointer cancel or `destroy()` drops the gesture. Touch pointers are captured
 * implicitly by the browser.
 */
export class SwipeController implements Controller {
	private readonly drag: PointerDragController;

	constructor(private readonly config: SwipeControllerConfig) {
		this.drag = new PointerDragController({
			getTarget: config.getTarget,
			getHandle: config.getHandle,
			capture: false,
			canStart: (event) => !config.exclude?.(event.target),
			onEnd: ({ reason, dx, dy, event }) => {
				const direction = reason === 'release' ? this.resolveDirection(dx, dy) : null;
				if (direction) {
					config.onSwipe(direction, event);
				}
			},
		});
	}

	attach(): void {
		this.drag.attach();
	}

	destroy(): void {
		this.drag.destroy();
	}

	/**
	 * Decides which swipe, if any, a gesture was. Runs on the pointer-up of the followed pointer, with the travel from the press point.
	 *
	 * @remarks Override to change what counts as a swipe, such as a minimum speed. Return `null` for no swipe; the default is `resolveSwipeDirection` with the configured `axis` and `threshold`.
	 */
	protected resolveDirection(dx: number, dy: number): SwipeDirection | null {
		return resolveSwipeDirection(dx, dy, this.config);
	}
}

/**
 * Creates a `SwipeController` that attaches when `host` connects and is destroyed when it disconnects.
 *
 * @example
 * ```ts
 * // in a RadiantElement subclass
 * createSwipeController(this, {
 *   getTarget: () => this,
 *   onSwipe: (direction) => (direction === 'left' ? this.next() : this.previous()),
 * });
 * ```
 */
export function createSwipeController(host: ControllerHost, config: SwipeControllerConfig): SwipeController {
	return bindController(host, new SwipeController(config));
}
