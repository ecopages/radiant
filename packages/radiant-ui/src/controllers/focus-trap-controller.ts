import { bindController, type Controller, type ControllerHost } from './controller';
import { EventListenerController } from './event-listener-controller';
import { resolveTrapMove } from './focus-trap-order';
import { queryFocusableCandidates } from '@/lib/focusable-elements';

/** The surface a `FocusTrapController` traps focus in, and how it picks the loop. */
export type FocusTrapControllerConfig = {
	/** The modal surface. `null` traps nothing, such as a node the view has not stamped yet. */
	getSurface: () => HTMLElement | null;
	/** The elements Tab loops over, in order. Defaults to the focusable descendants of the surface. */
	getFocusable?: () => HTMLElement[];
	/**
	 * Whether focus inside the surface but outside `getFocusable()` (the surface itself, a `tabindex="-1"` node) is
	 * pulled into the loop on Tab. Read on every key press; `false` when omitted.
	 */
	getStrict?: () => boolean;
};

/**
 * Keeps Tab and Shift+Tab inside a modal surface from `attach()` until `destroy()`.
 *
 * @remarks
 * `attach()` remembers the element that has focus, then moves focus to the first of `getFocusable()` (or to the
 * surface when it has none) in a microtask, so a surface revealed in the same task is ready. `destroy()` returns
 * focus to the remembered element. While attached, a Tab pressed with focus inside the surface wraps at either
 * end of the loop; the pure decision is `resolveTrapMove` in `focus-trap-order.ts`. A Tab pressed with focus
 * elsewhere is left alone, so two open modals do not pull focus from each other.
 *
 * Making the rest of the page `inert` is not part of this controller. It would have to walk the surface's
 * ancestors, remember which siblings were already inert, and restore them in order across nested modals, which
 * is a separate state machine from the key loop. The trap plus `aria-modal` on the surface covers keyboard
 * focus and assistive technology; a modal that must also block the pointer or find-in-page sets `inert`
 * itself.
 *
 * @example
 * ```ts
 * const trap = new FocusTrapController({ getSurface: () => dialog });
 * trap.attach(); // focus moves into `dialog`; Tab now loops inside it
 * trap.destroy(); // focus returns to where it was
 * ```
 */
export class FocusTrapController implements Controller {
	private readonly config: FocusTrapControllerConfig;
	private readonly keydown: EventListenerController<Document, 'keydown'>;
	private attached = false;
	private previouslyFocused: HTMLElement | null = null;

	constructor(config: FocusTrapControllerConfig) {
		this.config = config;
		this.keydown = new EventListenerController({
			getTarget: () => document,
			type: 'keydown',
			listener: (event) => this.handleKeydown(event),
		});
	}

	attach(): void {
		if (this.attached) {
			return;
		}
		this.attached = true;
		this.previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		this.keydown.attach();
		queueMicrotask(() => {
			if (this.attached) {
				this.focusInitial();
			}
		});
	}

	destroy(): void {
		if (!this.attached) {
			return;
		}
		this.attached = false;
		this.keydown.destroy();
		this.previouslyFocused?.focus();
		this.previouslyFocused = null;
	}

	private getFocusable(surface: HTMLElement): HTMLElement[] {
		return this.config.getFocusable?.() ?? queryFocusableCandidates(surface);
	}

	private focusInitial(): void {
		const surface = this.config.getSurface();
		if (surface) {
			(this.getFocusable(surface)[0] ?? surface).focus();
		}
	}

	private handleKeydown(event: KeyboardEvent): void {
		const surface = this.config.getSurface();
		const active = document.activeElement;
		if (event.key !== 'Tab' || !surface || !(active instanceof HTMLElement) || !surface.contains(active)) {
			return;
		}
		const move = resolveTrapMove(
			this.getFocusable(surface),
			active,
			event.shiftKey,
			this.config.getStrict?.() ?? false,
		);
		if (move.kind === 'native') {
			return;
		}
		event.preventDefault();
		(move.kind === 'item' ? move.item : surface).focus();
	}
}

/**
 * Creates a `FocusTrapController` that traps when `host` connects and releases when it disconnects.
 *
 * @example
 * ```ts
 * // in a RadiantElement subclass
 * createFocusTrapController(this, { getSurface: () => this.panel });
 * ```
 */
export function createFocusTrapController(
	host: ControllerHost,
	config: FocusTrapControllerConfig,
): FocusTrapController {
	return bindController(host, new FocusTrapController(config));
}
