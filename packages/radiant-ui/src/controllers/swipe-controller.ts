import { bindController, type Controller, type ControllerHost } from './controller';
import { EventListenerController } from './event-listener-controller';
import { resolveSwipeDirection, type SwipeDirection, type SwipeOptions } from './swipe-direction';

export type SwipeControllerConfig = SwipeOptions & {
	/** Resolved on every `attach()`; `null` listens to nothing. */
	getTarget: () => HTMLElement | null;
	/** A gesture that starts on a target this returns `true` for is ignored, such as a button inside the surface. */
	exclude?: (target: EventTarget | null) => boolean;
	/** Called on the pointer-up that ends a swipe, with the direction of travel from the press point. */
	onSwipe: (direction: SwipeDirection, event: PointerEvent) => void;
};

/**
 * Reports a swipe on an element: a primary-button press, travel past a threshold, and a release.
 *
 * @remarks
 * Reports once, on release; it does not follow the pointer. A surface that moves with the pointer or decides on
 * speed (the toast) needs a `PointerDragController`. Pointer capture is not taken, so a release outside the element
 * is never seen and the gesture stays pending until the next press or cancel; touch pointers are captured
 * implicitly by the browser. Only the pointer that went down counts, and a pointer cancel or `destroy()` drops the
 * gesture.
 */
export class SwipeController implements Controller {
	private pointerId: number | null = null;
	private startX = 0;
	private startY = 0;
	private readonly listeners: readonly Controller[];

	constructor(private readonly config: SwipeControllerConfig) {
		const listen = <K extends 'pointerdown' | 'pointerup' | 'pointercancel'>(
			type: K,
			listener: (event: HTMLElementEventMap[K]) => void,
		) => new EventListenerController({ getTarget: config.getTarget, type, listener });
		this.listeners = [
			listen('pointerdown', (event) => this.onPointerDown(event)),
			listen('pointerup', (event) => this.onPointerUp(event)),
			listen('pointercancel', (event) => this.onPointerCancel(event)),
		];
	}

	attach(): void {
		for (const listener of this.listeners) {
			listener.attach();
		}
	}

	destroy(): void {
		this.pointerId = null;
		for (const listener of this.listeners) {
			listener.destroy();
		}
	}

	private onPointerDown(event: PointerEvent): void {
		if (event.button !== 0 || this.config.exclude?.(event.target)) {
			return;
		}
		this.pointerId = event.pointerId;
		this.startX = event.clientX;
		this.startY = event.clientY;
	}

	private onPointerUp(event: PointerEvent): void {
		if (this.pointerId !== event.pointerId) {
			return;
		}
		this.pointerId = null;
		const direction = resolveSwipeDirection(event.clientX - this.startX, event.clientY - this.startY, this.config);
		if (direction) {
			this.config.onSwipe(direction, event);
		}
	}

	private onPointerCancel(event: PointerEvent): void {
		if (this.pointerId === event.pointerId) {
			this.pointerId = null;
		}
	}
}

/** Creates a `SwipeController` that attaches when `host` connects and is destroyed when it disconnects. */
export function createSwipeController(host: ControllerHost, config: SwipeControllerConfig): SwipeController {
	return bindController(host, new SwipeController(config));
}
