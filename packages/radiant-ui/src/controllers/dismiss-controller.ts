import { bindController, type Controller, type ControllerHost } from './controller';
import { EventListenerController } from './event-listener-controller';
import { portalOrigin } from './portal-controller';

/** What dismissed a surface: a pointer press outside it, focus leaving it, or Escape. */
export type DismissReason = 'pointer' | 'focus' | 'escape';

/** What `DismissController` watches, which triggers it hears and what it calls back. */
export type DismissControllerConfig = {
	/** The surface being dismissed (popover content, dialog panel, drawer). */
	getSurface: () => HTMLElement | null;
	/** Elements outside the surface that still count as inside, such as the trigger. */
	getRelated?: () => readonly (HTMLElement | null)[];
	/** Reports nothing while this returns `false`. Defaults to always open. */
	getOpen?: () => boolean;
	/**
	 * Called when the surface is dismissed.
	 *
	 * @remarks
	 * An Escape callback that leaves the surface open returns `false` to decline: the key is then offered to the
	 * next layer. Any other return value, including `undefined`, counts as handled. The return value is ignored for
	 * `pointer` and `focus`.
	 */
	onDismiss: (reason: DismissReason, event: Event) => void | boolean;
	/** Which triggers to listen for. Defaults to all of them. */
	triggers?: readonly DismissReason[];
	/**
	 * Judges a focus-out one microtask later and, when `relatedTarget` is `null`, by `document.activeElement`.
	 * For surfaces that contain elements that take focus after the old one blurs.
	 */
	settleFocus?: boolean;
	/**
	 * Where Escape counts. `document` (default) hears it from anywhere; `tree` only when the key event starts inside
	 * the surface or a related element, for a widget that must ignore Escape while focus is elsewhere.
	 */
	escapeScope?: 'document' | 'tree';
};

const ALL_TRIGGERS: readonly DismissReason[] = ['pointer', 'focus', 'escape'];

/** What the Escape registry asks of an attached controller, kept out of the controller's public surface. */
type EscapeLayer = {
	isCandidate: (event: Event) => boolean;
	getSurface: () => HTMLElement | null;
	dismiss: (event: Event) => void | boolean;
};

/** Attached controllers that listen for Escape, in attach order. */
const escapeLayers = new Map<DismissController, EscapeLayer>();

/** Escape key events already routed to the layers, so a later listener on the same press does nothing. */
const reportedEscapes = new WeakSet<Event>();

/**
 * Calls back when the user dismisses a surface: a pointer press outside it, focus leaving it, or Escape.
 *
 * @remarks
 * Works on any surface, with or without a popover. The surface and its related elements are read through getters
 * on every event, so they may change while attached. All listeners sit on `document`: a focus change inside the
 * surface or its related elements is ignored, and focus moving to nothing (`relatedTarget` is `null`) counts as
 * leaving, unless the browser window or tab lost focus (a focus-out with no `relatedTarget` while `document.activeElement` is still the blurred element, which is not a dismissal).
 *
 * Escape is reported wherever it happens in the document, to one layer per key press: among the attached controllers
 * that are open (and, with `escapeScope: 'tree'`, contain the event target), the layer whose surface is nested
 * inside the others wins, so Escape closes a popover before the dialog that holds it. Layers that are not nested
 * are told apart by the one that contains the event target, then by the latest attached. Escape during IME
 * composition is ignored, and so is one that was already reported or whose default was prevented (a menu closing
 * its submenu), so a layer that closes synchronously does not expose the next one to the same key press. The
 * callback decides whether to stop the event or restore focus. A callback that leaves its surface open returns
 * `false`, and the key goes to the next layer instead of being used up.
 */
export class DismissController implements Controller {
	private readonly listeners: Controller[] = [];
	private attached = false;
	private readonly listensForEscape: boolean;
	private focusSuppressed = false;
	private suppressTimer: ReturnType<typeof setTimeout> | undefined;

	constructor(private readonly config: DismissControllerConfig) {
		const triggers = config.triggers ?? ALL_TRIGGERS;
		const getTarget = () => document;
		this.listensForEscape = triggers.includes('escape');
		if (triggers.includes('pointer')) {
			this.listeners.push(
				new EventListenerController({
					getTarget,
					type: 'pointerdown',
					listener: (event) => this.onPointerDown(event),
				}),
			);
		}
		if (triggers.includes('focus')) {
			this.listeners.push(
				new EventListenerController({
					getTarget,
					type: 'focusout',
					listener: (event) => this.onFocusOut(event),
				}),
			);
		}
		if (triggers.includes('escape')) {
			this.listeners.push(
				new EventListenerController({ getTarget, type: 'keydown', listener: (event) => this.onKeyDown(event) }),
			);
		}
	}

	attach(): void {
		this.clearSuppression();
		this.attached = true;
		escapeLayers.delete(this);
		if (this.listensForEscape) {
			escapeLayers.set(this, {
				isCandidate: (event) => this.isEscapeCandidate(event),
				getSurface: () => this.config.getSurface(),
				dismiss: (event) => this.config.onDismiss('escape', event),
			});
		}
		for (const listener of this.listeners) {
			listener.attach();
		}
	}

	destroy(): void {
		this.clearSuppression();
		this.attached = false;
		escapeLayers.delete(this);
		for (const listener of this.listeners) {
			listener.destroy();
		}
	}

	/**
	 * Ignores the next focus-out, for a pointer press on an element whose focus change is not a dismissal, such as
	 * the trigger that toggles the surface.
	 *
	 * @remarks
	 * Expires at the end of the task, so a press that moves no focus (Safari does not focus a button on press) does
	 * not swallow a later Tab out of the surface.
	 */
	suppressFocus(): void {
		this.clearSuppression();
		this.focusSuppressed = true;
		this.suppressTimer = setTimeout(() => this.clearSuppression(), 0);
	}

	private clearSuppression(): void {
		clearTimeout(this.suppressTimer);
		this.focusSuppressed = false;
	}

	/** Whether `node` is the surface, inside it, or one of the related elements or inside one. */
	contains(node: Node | null): boolean {
		return node !== null && this.isInside(node);
	}

	/**
	 * Decides what counts as inside. Runs for every pointer press, focus change and Escape that `contains` and `isOutside` judge, and for those methods when an owner calls them.
	 *
	 * @remarks Override to widen or narrow the inside, such as a surface that counts a neighbouring toolbar. The default is the surface and the related elements, and anything inside them, including a popup a `PortalController` moved out of them (nested portals too).
	 */
	protected isInside(node: Node): boolean {
		for (let current: Node | null = node; current; current = portalOrigin(current)) {
			if (this.isInsideTree(current)) {
				return true;
			}
		}
		return false;
	}

	private isInsideTree(node: Node): boolean {
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

	private onPointerDown(event: PointerEvent): void {
		if (this.isOpen() && this.isOutside(event.target)) {
			this.config.onDismiss('pointer', event);
		}
	}

	private onFocusOut(event: FocusEvent): void {
		if (this.isOutside(event.target)) {
			return;
		}
		const { relatedTarget } = event;
		if (relatedTarget === null && document.activeElement === event.target) {
			return;
		}
		if (!this.config.settleFocus) {
			this.reportFocus(relatedTarget, event);
			return;
		}
		queueMicrotask(() => {
			if (this.attached) {
				this.reportFocus(relatedTarget instanceof Node ? relatedTarget : document.activeElement, event);
			}
		});
	}

	private reportFocus(next: EventTarget | null, event: FocusEvent): void {
		if (this.focusSuppressed) {
			this.clearSuppression();
			return;
		}
		if (this.isOpen() && this.isOutside(next)) {
			this.config.onDismiss('focus', event);
		}
	}

	private onKeyDown(event: KeyboardEvent): void {
		if (event.key !== 'Escape' || event.isComposing || event.defaultPrevented || reportedEscapes.has(event)) {
			return;
		}
		reportedEscapes.add(event);
		const declined = new Set<DismissController>();
		for (let layer = topEscapeLayer(event, declined); layer; layer = topEscapeLayer(event, declined)) {
			if (escapeLayers.get(layer)?.dismiss(event) !== false) {
				return;
			}
			declined.add(layer);
		}
	}

	private isEscapeCandidate(event: Event): boolean {
		if (this.config.escapeScope === 'tree' && this.isOutside(event.target)) {
			return false;
		}
		return this.isOpen();
	}
}

function isNestedIn(layer: DismissController, other: DismissController): boolean {
	const surface = escapeLayers.get(layer)?.getSurface() ?? null;
	const otherSurface = escapeLayers.get(other)?.getSurface() ?? null;
	return surface !== null && other.contains(surface) && !layer.contains(otherSurface);
}

function topEscapeLayer(event: KeyboardEvent, declined: ReadonlySet<DismissController>): DismissController | undefined {
	const candidates = [...escapeLayers]
		.filter(([controller, layer]) => !declined.has(controller) && layer.isCandidate(event))
		.map(([controller]) => controller);
	const topmost = candidates.filter((layer) => !candidates.some((other) => isNestedIn(other, layer)));
	const holders = topmost.filter((layer) => layer.contains(event.target as Node | null));
	return (holders.length > 0 ? holders : topmost).at(-1);
}

/**
 * Creates a `DismissController` that attaches when `host` connects and is destroyed when it disconnects.
 *
 * @example
 * ```ts
 * // in a RadiantElement subclass
 * createDismissController(this, {
 *   getSurface: () => this.panel,
 *   getRelated: () => [this.trigger],
 *   getOpen: () => this.open,
 *   onDismiss: () => (this.open = false),
 * });
 * ```
 */
export function createDismissController(host: ControllerHost, config: DismissControllerConfig): DismissController {
	return bindController(host, new DismissController(config));
}
