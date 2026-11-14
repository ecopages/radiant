import { bindController, type Controller, type ControllerHost } from './controller';
import { EventListenerController } from './event-listener-controller';
import { PointerDragController, type PointerDragInfo, type PointerDragEnd } from './pointer-drag-controller';
import { DEFAULT_SORTABLE_MESSAGES, type SortableMessageContext, type SortableMessages } from './sortable-messages';
import { resolveSortIndex, resolveSortKeyIndex, type SortableAxis } from './sortable-order';

/** Set on the item being moved, with the value `lifted`, from the lift until the sort ends. */
export const SORTABLE_STATE_ATTRIBUTE = 'data-sortable-state';
/** Set on the item the lifted one would land next to, `before` or `after` it; absent while the target is the starting place. */
export const SORTABLE_DROP_ATTRIBUTE = 'data-sortable-drop';
/** Set on the container (empty) for the length of a sort. */
export const SORTABLE_ACTIVE_ATTRIBUTE = 'data-sortable-active';
/** Custom properties on the lifted item: how far the pointer moved since the press, in px. Pointer sorts only. */
export const SORTABLE_OFFSET_PROPERTIES = { x: '--sortable-dx', y: '--sortable-dy' } as const;

/** How the sort was driven. */
export type SortableSource = 'pointer' | 'keyboard';

/** A reorder the owner is asked to apply. */
export type SortableChange = {
	item: HTMLElement;
	/** Index in the items before the move. */
	from: number;
	/** Index the item takes in the reordered list. */
	to: number;
	source: SortableSource;
};

/** The sort in progress, for an owner that draws a placeholder from it. */
export type SortableState = SortableChange;

export type SortableControllerConfig = {
	/** The element that holds the items; it receives the press and the keys. Resolved on every `attach()`. */
	getContainer: () => HTMLElement | null;
	/** Read on every event, in document order, so the list can change without telling the controller. */
	getItems: () => HTMLElement[];
	/** Narrows where a press or Space/Enter lifts an item to a handle inside it. Without it the whole item lifts. */
	getHandle?: (item: HTMLElement) => HTMLElement | null;
	/** Which way the list runs. Default `vertical`. `both` suits a wrapping layout. */
	axis?: SortableAxis;
	/** Pointer travel in px before a press becomes a drag, so a click still clicks. Default `4`. */
	threshold?: number;
	/** Return `false` to ignore presses and keys. */
	enabled?: () => boolean;
	/** The name announced for an item. Default: its trimmed `textContent`. */
	getLabel?: (item: HTMLElement) => string;
	/** Receives each announcement; point it at a live region (`aria-live="polite"`). Without it nothing is announced. */
	announce?: (message: string) => void;
	/** Replaces any of the announcements; see `DEFAULT_SORTABLE_MESSAGES`. */
	messages?: Partial<SortableMessages>;
	/**
	 * Called on drop with a move to apply. Return `false` to refuse it: the sort ends as a cancel.
	 *
	 * @remarks Not called when the item is dropped where it started.
	 */
	onChange?: (change: SortableChange) => boolean | void;
};

type Candidate = { item: HTMLElement; from: number };

type Session = SortableChange & { items: HTMLElement[]; container: HTMLElement };

const DEFAULT_THRESHOLD_PX = 4;

/**
 * Reorders the items of one container by pointer drag or keyboard, and tells the owner the new index.
 *
 * @example
 * ```ts
 * // In a RadiantElement constructor; `this` is the host.
 * const list = this.querySelector('ul')!;
 * const status = this.querySelector('[aria-live]')!;
 * createSortableController(this, {
 *   getContainer: () => list,
 *   getItems: () => [...list.children] as HTMLElement[],
 *   announce: (message) => (status.textContent = message),
 *   onChange: ({ item, to }) => list.insertBefore(item, [...list.children].filter((el) => el !== item)[to] ?? null),
 * });
 * ```
 *
 * @remarks
 * The controller never moves a node. It follows the drag, works out where the item would land, and on drop calls
 * `onChange({ item, from, to, source })` for the owner to apply (`reorder` in `sortable-order` computes a new
 * array); returning `false` refuses the move. While a sort runs it only sets state for CSS to draw: `data-sortable-active`
 * on the container, `data-sortable-state="lifted"` on the item, `data-sortable-drop="before|after"` on the item the
 * lifted one would land beside, and `--sortable-dx` / `--sortable-dy` on the lifted item (pointer travel, for a
 * `transform`). No style is applied. `getState()` returns the sort in progress for owners that draw a placeholder.
 *
 * Pointer: a press on an item (or on its handle) followed by `threshold` px of travel lifts it; the target index
 * comes from `resolveSortIndex` over the item rects, read on every move, so the owner must leave the DOM as it is
 * until `onChange`. Releasing, losing the pointer (`pointercancel`) and destroying the controller end the sort;
 * only a release applies it. Pointer capture is off so clicks inside items still reach them, and the click that
 * would follow a drag is swallowed. The owner's CSS needs `touch-action: none` on the draggable part (the handle or
 * the item) for touch, and `user-select: none` to stop text selection while dragging.
 *
 * Keyboard: Space or Enter on the item itself (or its handle, not a button inside it) lifts it. Arrow keys of the
 * axis move the target one step, Home and End jump to the ends, Space or Enter drops and Escape cancels (Escape is
 * stopped so an enclosing dialog or popover stays open). Focus leaving the item cancels. After a drop the owner
 * moves the node, which blurs it in some browsers: restore focus on the moved item. Focusable items are the
 * owner's, typically through `RovingController`.
 *
 * `announce` gets the lift, each move, the drop and a cancel, built by `messages` (English by default; every
 * builder takes the item label and its position). Not handled: autoscrolling a scroll container while the pointer
 * nears its edge (the owner scrolls and the rects update on the next move), right-to-left arrow flipping (see
 * `resolveSortKeyIndex`), and dropping in another container.
 *
 * The constructor reads nothing. `destroy()` ends a sort in progress without calling `onChange` or announcing.
 */
export class SortableController implements Controller {
	private candidate: Candidate | null = null;
	private session: Session | null = null;

	private readonly pointer: PointerDragController;
	private readonly keys: EventListenerController<HTMLElement, 'keydown' | 'focusout'>;

	constructor(private readonly config: SortableControllerConfig) {
		this.pointer = new PointerDragController({
			getTarget: config.getContainer,
			capture: false,
			canStart: (event) => this.onPress(event),
			onMove: (info) => this.onPointerMove(info),
			onEnd: (end) => this.onPointerEnd(end),
		});
		this.keys = new EventListenerController<HTMLElement, 'keydown' | 'focusout'>({
			getTarget: config.getContainer,
			type: ['keydown', 'focusout'],
			listener: (event) => {
				if (event instanceof KeyboardEvent) {
					this.onKeydown(event);
				} else {
					this.onFocusOut(event);
				}
			},
		});
	}

	attach(): void {
		this.pointer.attach();
		this.keys.attach();
	}

	destroy(): void {
		this.keys.destroy();
		this.pointer.destroy();
		this.end();
	}

	/** The sort in progress, or `null`. `to` follows the pointer or keys until the drop. */
	getState(): SortableState | null {
		const session = this.session;
		return session ? { item: session.item, from: session.from, to: session.to, source: session.source } : null;
	}

	private findItem(target: EventTarget | null, items: HTMLElement[]): HTMLElement | null {
		const container = this.config.getContainer();
		let node = target instanceof Element ? target : null;
		while (node && node !== container) {
			if (node instanceof HTMLElement && items.includes(node)) {
				return node;
			}
			node = node.parentElement;
		}
		return null;
	}

	private onPress(event: PointerEvent): boolean {
		this.candidate = null;
		if (this.session || this.config.enabled?.() === false) {
			return false;
		}
		const items = this.config.getItems();
		const item = this.findItem(event.target, items);
		if (!item) {
			return false;
		}
		if (this.config.getHandle) {
			const handle = this.config.getHandle(item);
			if (!handle?.contains(event.target as Node)) {
				return false;
			}
		}
		this.candidate = { item, from: items.indexOf(item) };
		return true;
	}

	private onPointerMove(info: PointerDragInfo): void {
		const session = this.session ?? this.liftPastThreshold(info);
		if (!session) {
			return;
		}
		session.item.style.setProperty(SORTABLE_OFFSET_PROPERTIES.x, `${info.dx}px`);
		session.item.style.setProperty(SORTABLE_OFFSET_PROPERTIES.y, `${info.dy}px`);
		const rects = session.items.map((item) => item.getBoundingClientRect());
		this.moveTo(session, resolveSortIndex(rects, session.from, { x: info.x, y: info.y }, this.config.axis));
	}

	private liftPastThreshold(info: PointerDragInfo): Session | null {
		const threshold = this.config.threshold ?? DEFAULT_THRESHOLD_PX;
		return Math.hypot(info.dx, info.dy) < threshold ? null : this.lift(this.candidate!, 'pointer');
	}

	private onPointerEnd(end: PointerDragEnd): void {
		const session = this.session;
		if (!session) {
			return;
		}
		if (end.reason === 'release') {
			this.swallowClick(session.container);
			this.drop(session);
		} else if (end.reason === 'cancel') {
			this.cancel(session);
		} else {
			this.end();
		}
	}

	private swallowClick(container: HTMLElement): void {
		const swallow = (event: Event) => event.stopPropagation();
		container.addEventListener('click', swallow, { capture: true, once: true });
		setTimeout(() => container.removeEventListener('click', swallow, { capture: true }), 0);
	}

	private onKeydown(event: KeyboardEvent): void {
		const session = this.session;
		if (this.config.enabled?.() === false || session?.source === 'pointer') {
			return;
		}
		if (session) {
			this.steer(session, event);
		} else {
			this.liftFromKey(event);
		}
	}

	private liftFromKey(event: KeyboardEvent): void {
		if (event.key !== ' ' && event.key !== 'Enter') {
			return;
		}
		const items = this.config.getItems();
		const item = this.findItem(event.target, items);
		if (item && event.target === (this.config.getHandle?.(item) ?? item)) {
			event.preventDefault();
			this.lift({ item, from: items.indexOf(item) }, 'keyboard');
		}
	}

	private steer(session: Session, event: KeyboardEvent): void {
		if (event.key === ' ' || event.key === 'Enter') {
			event.preventDefault();
			this.drop(session);
		} else if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			this.cancel(session);
		} else {
			const next = resolveSortKeyIndex(event.key, session.to, session.items.length, this.config.axis);
			if (next !== null) {
				event.preventDefault();
				this.moveTo(session, next);
			}
		}
	}

	private onFocusOut(event: FocusEvent): void {
		const session = this.session;
		if (session?.source === 'keyboard' && !session.item.contains(event.relatedTarget as Node | null)) {
			this.cancel(session);
		}
	}

	private lift({ item, from }: Candidate, source: SortableSource): Session {
		const container = this.config.getContainer()!;
		const session: Session = { item, from, to: from, source, items: this.config.getItems(), container };
		this.session = session;
		item.setAttribute(SORTABLE_STATE_ATTRIBUTE, 'lifted');
		container.setAttribute(SORTABLE_ACTIVE_ATTRIBUTE, '');
		this.announce('lift', this.context(session));
		return session;
	}

	private moveTo(session: Session, to: number): void {
		if (session.to === to) {
			return;
		}
		session.to = to;
		for (const item of session.items) {
			item.removeAttribute(SORTABLE_DROP_ATTRIBUTE);
		}
		if (to !== session.from) {
			session.items[to].setAttribute(SORTABLE_DROP_ATTRIBUTE, to > session.from ? 'after' : 'before');
		}
		this.announce('move', this.context(session));
	}

	private drop(session: Session): void {
		const change: SortableChange = {
			item: session.item,
			from: session.from,
			to: session.to,
			source: session.source,
		};
		const context = this.context(session);
		this.end();
		if (change.to !== change.from && this.config.onChange?.(change) === false) {
			this.announce('cancel', context);
		} else {
			this.announce('drop', context);
		}
	}

	private cancel(session: Session): void {
		const context = this.context(session);
		this.end();
		this.announce('cancel', { ...context, to: context.from, position: context.from + 1 });
	}

	private end(): void {
		const session = this.session;
		this.session = null;
		this.candidate = null;
		if (!session) {
			return;
		}
		for (const item of session.items) {
			item.removeAttribute(SORTABLE_DROP_ATTRIBUTE);
		}
		session.item.removeAttribute(SORTABLE_STATE_ATTRIBUTE);
		session.item.style.removeProperty(SORTABLE_OFFSET_PROPERTIES.x);
		session.item.style.removeProperty(SORTABLE_OFFSET_PROPERTIES.y);
		session.container.removeAttribute(SORTABLE_ACTIVE_ATTRIBUTE);
	}

	private context(session: Session): SortableMessageContext {
		const label = this.config.getLabel?.(session.item) ?? session.item.textContent.trim();
		return { label, from: session.from, to: session.to, position: session.to + 1, total: session.items.length };
	}

	private announce(step: keyof SortableMessages, context: SortableMessageContext): void {
		const build = this.config.messages?.[step] ?? DEFAULT_SORTABLE_MESSAGES[step];
		this.config.announce?.(build(context));
	}
}

/** Creates a `SortableController` that attaches when `host` connects and is destroyed when it disconnects. */
export function createSortableController(host: ControllerHost, config: SortableControllerConfig): SortableController {
	return bindController(host, new SortableController(config));
}
