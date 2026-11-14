import { bindController, type Controller, type ControllerHost } from './controller';
import { EventListenerController } from './event-listener-controller';

/** The pointer during a drag: where it started, where it is and how far it moved. Coordinates are client pixels. */
export type PointerDragInfo = {
	/** The pointer event being reported; for a `destroy` end, the last one seen. */
	event: PointerEvent;
	pointerId: number;
	startX: number;
	startY: number;
	x: number;
	y: number;
	/** `x - startX`. */
	dx: number;
	/** `y - startY`. */
	dy: number;
	/**
	 * The topmost element at the pointer's current position.
	 *
	 * @remarks
	 * Asked on demand because it forces hit testing. While the pointer is captured every event targets the
	 * dragged element, so `event.target` cannot answer this; a sortable list asks it to find the drop target.
	 * `null` when the point is outside the viewport.
	 */
	elementUnderPointer(): Element | null;
};

export type PointerDragEndReason = 'release' | 'cancel' | 'destroy';

export type PointerDragEnd = PointerDragInfo & {
	/** `release`: pointer up. `cancel`: the browser took the pointer. `destroy`: the controller was torn down mid-drag. */
	reason: PointerDragEndReason;
};

export type PointerDragControllerConfig = {
	/** Where a press starts a drag and where the pointer is captured; resolved on every `attach()`. */
	getTarget: () => HTMLElement | null;
	/** Refuses a press (disabled or read-only control, a child that handles its own presses). The primary button is already required. */
	canStart?: (event: PointerEvent) => boolean;
	/**
	 * Capture the pointer on the target. Default `true`.
	 *
	 * @remarks
	 * Set `false` when the target is a container whose children must keep receiving `click`: Chromium sends the
	 * click of a captured pointer to the capturing element. Moves are still tracked on `document`, but a touch
	 * pointer then needs `touch-action: none` from the owner's CSS so the browser does not claim it to scroll.
	 */
	capture?: boolean;
	/** Called on the accepted press, after the pointer is captured. `event.preventDefault()` is the owner's call. */
	onStart?: (info: PointerDragInfo) => void;
	onMove?: (info: PointerDragInfo) => void;
	/** Called once per drag, however it ends. */
	onEnd?: (info: PointerDragEnd) => void;
};

type DragSession = {
	pointerId: number;
	startX: number;
	startY: number;
	target: HTMLElement;
	last: PointerEvent;
};

/**
 * Owns the plumbing of a pointer drag: capture, move, end and cancel, and cleanup if torn down mid-drag.
 *
 * @remarks
 * Reports raw pointer geometry only (position, delta from the press, the element under the pointer) and knows
 * nothing of values, steps or axes, so the owner keeps its own math. A press needs the primary button and starts
 * a drag; only that pointer is followed until it ends. Move, up and cancel are listened for on `document` from
 * the press until the end, so the drag keeps tracking when the pointer leaves the target and when events are
 * dispatched off it. Capture is requested on the target; a browser that refuses (a synthetic pointer id) does not
 * stop the drag. `destroy()` during a drag releases capture, drops the listeners and reports `onEnd` with reason
 * `destroy` so the owner can clear its drag state.
 */
export class PointerDragController implements Controller {
	private session: DragSession | null = null;

	private readonly press: Controller;
	private readonly drag: readonly Controller[];

	constructor(private readonly config: PointerDragControllerConfig) {
		const getDocument = () => document;
		this.press = new EventListenerController({
			getTarget: config.getTarget,
			type: 'pointerdown',
			listener: (event) => this.onPointerDown(event),
		});
		this.drag = [
			new EventListenerController({
				getTarget: getDocument,
				type: 'pointermove',
				listener: (event) => this.onPointerMove(event),
			}),
			new EventListenerController({
				getTarget: getDocument,
				type: 'pointerup',
				listener: (event) => this.onPointerEnd(event, 'release'),
			}),
			new EventListenerController({
				getTarget: getDocument,
				type: 'pointercancel',
				listener: (event) => this.onPointerEnd(event, 'cancel'),
			}),
		];
	}

	attach(): void {
		this.press.attach();
	}

	destroy(): void {
		this.press.destroy();
		if (this.session) {
			this.finish(this.session, 'destroy', this.session.last);
		}
	}

	/**
	 * Decides whether a press starts a drag. Runs on every `pointerdown` on the target while no drag is running.
	 *
	 * @remarks Override to change which presses count, such as also taking the middle button. The default accepts the primary button when `canStart` does not refuse.
	 */
	protected acceptsPress(event: PointerEvent): boolean {
		return event.button === 0 && this.config.canStart?.(event) !== false;
	}

	private onPointerDown(event: PointerEvent): void {
		const target = this.config.getTarget();
		if (this.session || !target || !this.acceptsPress(event)) {
			return;
		}
		this.session = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			target,
			last: event,
		};
		if (this.config.capture !== false) {
			try {
				target.setPointerCapture(event.pointerId);
			} catch {}
		}
		for (const listener of this.drag) {
			listener.attach();
		}
		this.config.onStart?.(this.info(this.session, event));
	}

	private onPointerMove(event: PointerEvent): void {
		if (!this.session || event.pointerId !== this.session.pointerId) {
			return;
		}
		this.session.last = event;
		this.config.onMove?.(this.info(this.session, event));
	}

	private onPointerEnd(event: PointerEvent, reason: PointerDragEndReason): void {
		if (!this.session || event.pointerId !== this.session.pointerId) {
			return;
		}
		this.finish(this.session, reason, event);
	}

	private finish(session: DragSession, reason: PointerDragEndReason, event: PointerEvent): void {
		const info = this.info(session, event);
		this.session = null;
		for (const listener of this.drag) {
			listener.destroy();
		}
		if (session.target.hasPointerCapture(session.pointerId)) {
			session.target.releasePointerCapture(session.pointerId);
		}
		this.config.onEnd?.({ ...info, reason });
	}

	private info({ pointerId, startX, startY }: DragSession, event: PointerEvent): PointerDragInfo {
		return {
			event,
			pointerId,
			startX,
			startY,
			x: event.clientX,
			y: event.clientY,
			dx: event.clientX - startX,
			dy: event.clientY - startY,
			elementUnderPointer: () => document.elementFromPoint(event.clientX, event.clientY),
		};
	}
}

/** Creates a `PointerDragController` that attaches when `host` connects and is destroyed when it disconnects. */
export function createPointerDragController(
	host: ControllerHost,
	config: PointerDragControllerConfig,
): PointerDragController {
	return bindController(host, new PointerDragController(config));
}
