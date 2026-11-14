import { bindController, type Controller, type ControllerHost } from './controller';
import { EventListenerController } from './event-listener-controller';

export type DismissReason = 'pointer' | 'focus' | 'escape';

export type DismissControllerConfig = {
	/** The surface being dismissed (popover content, dialog panel, drawer). */
	getSurface: () => HTMLElement | null;
	/** Elements outside the surface that still count as inside, such as the trigger. */
	getRelated?: () => readonly (HTMLElement | null)[];
	/** Reports nothing while this returns `false`. Defaults to always open. */
	getOpen?: () => boolean;
	onDismiss: (reason: DismissReason, event: Event) => void;
	/** Which triggers to listen for. Defaults to all of them. */
	triggers?: readonly DismissReason[];
};

const ALL_TRIGGERS: readonly DismissReason[] = ['pointer', 'focus', 'escape'];

/**
 * Calls back when the user dismisses a surface: a pointer press outside it, focus leaving it, or Escape.
 *
 * @remarks
 * Works on any surface, with or without a popover. The surface and its related elements are read through getters
 * on every event, so they may change while attached. All listeners sit on `document`: a focus change inside the
 * surface or its related elements is ignored, and focus moving to nothing (`relatedTarget` is `null`) counts as
 * leaving. Escape is reported wherever it happens in the document; the callback decides whether to stop it or
 * restore focus.
 */
export class DismissController implements Controller {
	private readonly listeners: EventListenerController[] = [];

	constructor(private readonly config: DismissControllerConfig) {
		const triggers = config.triggers ?? ALL_TRIGGERS;
		const listen = (reason: DismissReason, type: string, listener: (event: Event) => void) => {
			if (triggers.includes(reason)) {
				this.listeners.push(
					new EventListenerController({
						getTarget: () => (typeof document === 'undefined' ? null : document),
						type,
						listener,
					}),
				);
			}
		};
		listen('pointer', 'pointerdown', (event) => this.onPointerDown(event));
		listen('focus', 'focusout', (event) => this.onFocusOut(event as FocusEvent));
		listen('escape', 'keydown', (event) => this.onKeyDown(event as KeyboardEvent));
	}

	attach(): void {
		for (const listener of this.listeners) {
			listener.attach();
		}
	}

	destroy(): void {
		for (const listener of this.listeners) {
			listener.destroy();
		}
	}

	/** Whether `node` is the surface, inside it, or one of the related elements or inside one. */
	contains(node: Node | null): boolean {
		if (!node) {
			return false;
		}
		if (this.config.getSurface()?.contains(node)) {
			return true;
		}
		return (this.config.getRelated?.() ?? []).some((related) => related?.contains(node));
	}

	/** Whether `target` is not a node, or is outside the surface and its related elements. */
	isOutside(target: EventTarget | null): boolean {
		return !(target instanceof Node) || !this.contains(target);
	}

	private isOpen(): boolean {
		return this.config.getOpen?.() ?? true;
	}

	private onPointerDown(event: Event): void {
		if (this.isOpen() && this.isOutside(event.target)) {
			this.config.onDismiss('pointer', event);
		}
	}

	private onFocusOut(event: FocusEvent): void {
		if (this.isOpen() && !this.isOutside(event.target) && this.isOutside(event.relatedTarget)) {
			this.config.onDismiss('focus', event);
		}
	}

	private onKeyDown(event: KeyboardEvent): void {
		if (this.isOpen() && event.key === 'Escape') {
			this.config.onDismiss('escape', event);
		}
	}
}

/** Creates a `DismissController` that attaches when `host` connects and is destroyed when it disconnects. */
export function createDismissController(host: ControllerHost, config: DismissControllerConfig): DismissController {
	return bindController(host, new DismissController(config));
}
