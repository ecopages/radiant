import { bindController, type Controller, type ControllerHost } from './controller';
import { EventListenerController } from './event-listener-controller';
import { PointerDragController, type PointerDragInfo, type PointerDragEnd } from './pointer-drag-controller';
import type { SortableGroup, SortableMember } from './sortable-group';
import { DEFAULT_SORTABLE_MESSAGES, type SortableMessageContext, type SortableMessages } from './sortable-messages';
import {
	findRectIndex,
	resolveContainerKeyIndex,
	resolveInsertIndex,
	resolveSortIndex,
	resolveSortKeyIndex,
	type SortableAxis,
	type SortableRect,
} from './sortable-order';

/** Set on the item being moved, with the value `lifted`, from the lift until the sort ends. */
export const SORTABLE_STATE_ATTRIBUTE = 'data-sortable-state';
/** Set on the item the lifted one would land next to, `before` or `after` it; absent while the target is the starting place. */
export const SORTABLE_DROP_ATTRIBUTE = 'data-sortable-drop';
/** Set on the container the item is lifted from, for the length of a sort. */
export const SORTABLE_ACTIVE_ATTRIBUTE = 'data-sortable-active';
/** Set on another container of the group while the lifted item is over it. */
export const SORTABLE_OVER_ATTRIBUTE = 'data-sortable-over';
/** Custom properties on the lifted item: how far the pointer moved since the press, in px. Pointer sorts only. */
export const SORTABLE_OFFSET_PROPERTIES = { x: '--sortable-dx', y: '--sortable-dy' } as const;

/** How the sort was driven. */
export type SortableSource = 'pointer' | 'keyboard';

/** A move the owner is asked to apply. */
export type SortableChange = {
	item: HTMLElement;
	/** Index in the items of `fromContainer` before the move. */
	from: number;
	/** Index the item takes in the items of `toContainer` once moved. */
	to: number;
	source: SortableSource;
	/** The container the item was lifted from. */
	fromContainer: HTMLElement;
	/** The container it is dropped in: `fromContainer` for a reorder, another container of the group for a move. */
	toContainer: HTMLElement;
};

/** The sort in progress, for an owner that draws a placeholder from it. */
export type SortableState = SortableChange;

/** The container, items and callbacks of a `SortableController`. */
export type SortableControllerConfig = {
	/** The element that holds the items; it receives the press and the keys. Resolved on every `attach()`. */
	getContainer: () => HTMLElement | null;
	/** Read on every event, in document order, so the list can change without telling the controller. */
	getItems: () => HTMLElement[];
	/** The containers that can exchange items. Without it items only reorder within this container. */
	group?: SortableGroup;
	/** Refuses an item that comes from another container of the group; a container that refuses is skipped as a target. Default: accepts. */
	accepts?: (item: HTMLElement, fromContainer: HTMLElement) => boolean;
	/** The name announced for this container. Default: its `aria-label`, else empty. */
	getContainerLabel?: () => string;
	/** Narrows where a press or Space/Enter lifts an item to a handle inside it. Without it the whole item lifts. */
	getHandle?: (item: HTMLElement) => HTMLElement | null;
	/**
	 * The keys that lift an item. Default Space and Enter.
	 *
	 * @remarks Drop is always Space or Enter. Narrow this when Enter or Space already does something on the item, such as selecting it.
	 */
	liftKeys?: readonly string[];
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

type Session = Omit<SortableChange, 'toContainer'> & {
	items: HTMLElement[];
	/** The container the item is over now, and its items. */
	target: SortableMember;
	targetItems: HTMLElement[];
};

const DEFAULT_THRESHOLD_PX = 4;

const DEFAULT_LIFT_KEYS = [' ', 'Enter'];

/**
 * Reorders the items of a container, or moves them between containers, by pointer drag or keyboard, and tells the
 * owner the indexes.
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
 * @example
 * Two lists that exchange items: share a group, and insert into `toContainer`.
 * ```ts
 * const group = new SortableGroup();
 * const sortable = (list: HTMLElement) =>
 *   createSortableController(this, {
 *     group,
 *     getContainer: () => list,
 *     getItems: () => [...list.children] as HTMLElement[],
 *     onChange: ({ item, to, toContainer }) =>
 *       toContainer.insertBefore(item, [...toContainer.children].filter((el) => el !== item)[to] ?? null),
 *   });
 * sortable(this.querySelector('#todo')!);
 * sortable(this.querySelector('#done')!);
 * ```
 *
 * @remarks
 * The controller never moves a node. It follows the drag, works out where the item would land, and on drop calls
 * `onChange({ item, from, to, source, fromContainer, toContainer })` for the owner to apply (`reorder` in
 * `sortable-order` computes a new array); returning `false` refuses the move. While a sort runs it only sets state
 * for CSS to draw: `data-sortable-active` on the container the item came from, `data-sortable-over` on another
 * container of the group it is over, `data-sortable-state="lifted"` on the item, `data-sortable-drop="before|after"`
 * on the item the lifted one would land beside, and `--sortable-dx` / `--sortable-dy` on the lifted item (pointer
 * travel, for a `transform`). No style is applied. `getState()` returns the sort in progress for owners that draw a
 * placeholder.
 *
 * Pointer: a press on an item (or on its handle) followed by `threshold` px of travel lifts it; the target index
 * comes from `resolveSortIndex` over the item rects, read on every move, so the owner must leave the DOM as it is
 * until `onChange`. Releasing, losing the pointer (`pointercancel`) and destroying the controller end the sort;
 * only a release applies it. Pointer capture is off so clicks inside items still reach them, and the click that
 * would follow a drag is swallowed. The owner's CSS needs `touch-action: none` on the draggable part (the handle or
 * the item) for touch, and `user-select: none` to stop text selection while dragging.
 *
 * Keyboard: Space or Enter (`liftKeys`) on the item itself (or its handle, not a button inside it) lifts it. Arrow keys of the
 * axis move the target one step, Home and End jump to the ends, Space or Enter drops and Escape cancels (Escape is
 * stopped so an enclosing dialog or popover stays open). Focus leaving the item cancels. After a drop the owner
 * moves the node, which blurs it in some browsers: restore focus on the moved item. Focusable items are the
 * owner's, typically through `RovingController`.
 *
 * Groups: every container of a `SortableGroup` has its own controller; the one the item was lifted from reports
 * the change, so one `onChange` sees both containers (`fromContainer` and `toContainer`, with `to` an index among
 * the items `toContainer` has once the item is in it). The container under the pointer is found by comparing the
 * pointer with each container's rect, not with `elementFromPoint`, so a lifted item that follows the pointer with a
 * `transform` cannot hide it; the last container hovered stays the target while the pointer is outside every one.
 * `PageDown` and `PageUp` move the lifted item to the next and previous container of the group, keeping its index
 * as far as the other list allows. A container whose `accepts` returns `false` is never a target, and an empty
 * container is a drop zone: it needs no items and its `getItems` may return `[]`. Containers are matched in the
 * group's join order, so nested containers are not supported.
 *
 * `announce` gets the lift, each move, the drop and a cancel, built by `messages` (English by default; every
 * builder takes the item label, its position and the container names). Not handled: autoscrolling a scroll
 * container while the pointer nears its edge (the owner scrolls and the rects update on the next move), and
 * right-to-left arrow flipping (see `resolveSortKeyIndex`).
 *
 * The constructor reads nothing. `destroy()` ends a sort in progress without calling `onChange` or announcing,
 * and leaves the group.
 */
export class SortableController implements Controller {
	private candidate: Candidate | null = null;
	private session: Session | null = null;

	private readonly pointer: PointerDragController;
	private readonly keys: EventListenerController<HTMLElement, 'keydown' | 'focusout'>;
	private readonly member: SortableMember;

	constructor(private readonly config: SortableControllerConfig) {
		this.member = {
			getContainer: config.getContainer,
			getItems: config.getItems,
			accepts: (item, fromContainer) => config.accepts?.(item, fromContainer) !== false,
			getLabel: () => config.getContainerLabel?.() ?? config.getContainer()?.getAttribute('aria-label') ?? '',
		};
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
		this.config.group?.add(this.member);
		this.pointer.attach();
		this.keys.attach();
	}

	destroy(): void {
		this.keys.destroy();
		this.pointer.destroy();
		this.end();
		this.config.group?.remove(this.member);
	}

	/** The sort in progress, or `null`. `to` and `toContainer` follow the pointer or keys until the drop. */
	getState(): SortableState | null {
		return this.session && this.change(this.session);
	}

	private change(session: Session): SortableChange {
		const { item, from, to, source, fromContainer } = session;
		return { item, from, to, source, fromContainer, toContainer: session.target.getContainer()! };
	}

	private members(): readonly SortableMember[] {
		return this.config.group?.members ?? [this.member];
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
		const point = { x: info.x, y: info.y };
		const eligible = this.eligibleTargets(session);
		const hovered = findRectIndex(
			eligible.map((member) => member.getContainer()!.getBoundingClientRect()),
			point,
		);
		const target = hovered === -1 ? session.target : eligible[hovered];
		const items = target === this.member ? session.items : target.getItems();
		const rects = items.map((item) => item.getBoundingClientRect());
		const from = target === this.member ? session.from : null;
		this.place(session, target, items, this.resolveTargetIndex(rects, from, point));
	}

	/**
	 * Decides the index the lifted item takes from where the pointer is. Runs on every pointer move of a sort, over the rects of the items of the container under the pointer.
	 *
	 * @remarks Override to snap to a grid or change where a neighbour gives way. `from` is the item's own index when it is over its own container (its rect is in `rects`), and `null` over another container of the group. Return an index in the reordered list: `0` to `rects.length - 1` over the own container, `0` to `rects.length` over another. The default is `resolveSortIndex` and `resolveInsertIndex` with the configured axis.
	 */
	protected resolveTargetIndex(
		rects: readonly SortableRect[],
		from: number | null,
		point: { x: number; y: number },
	): number {
		return from === null
			? resolveInsertIndex(rects, point, this.config.axis)
			: resolveSortIndex(rects, from, point, this.config.axis);
	}

	/** This container and the group members that accept the item, in group order. */
	private eligibleTargets(session: Session): SortableMember[] {
		return this.members().filter(
			(member) =>
				member.getContainer() !== null &&
				(member === this.member || member.accepts(session.item, session.fromContainer)),
		);
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
			this.swallowClick(session.fromContainer);
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
		if (!(this.config.liftKeys ?? DEFAULT_LIFT_KEYS).includes(event.key)) {
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
		} else if (this.steerContainer(session, event) || this.steerIndex(session, event)) {
			event.preventDefault();
		}
	}

	private steerContainer(session: Session, event: KeyboardEvent): boolean {
		const eligible = this.eligibleTargets(session);
		const next = resolveContainerKeyIndex(event.key, eligible.indexOf(session.target), eligible.length);
		if (next === null) {
			return false;
		}
		const target = eligible[next];
		if (target !== session.target) {
			const items = target === this.member ? session.items : target.getItems();
			const slots = target === this.member ? items.length - 1 : items.length;
			this.place(session, target, items, Math.min(session.to, slots));
		}
		return true;
	}

	private steerIndex(session: Session, event: KeyboardEvent): boolean {
		const slots = session.target === this.member ? session.items.length : session.targetItems.length + 1;
		const next = resolveSortKeyIndex(event.key, session.to, slots, this.config.axis);
		if (next === null) {
			return false;
		}
		this.place(session, session.target, session.targetItems, next);
		return true;
	}

	private onFocusOut(event: FocusEvent): void {
		const session = this.session;
		if (session?.source === 'keyboard' && !session.item.contains(event.relatedTarget as Node | null)) {
			this.cancel(session);
		}
	}

	private lift({ item, from }: Candidate, source: SortableSource): Session {
		const fromContainer = this.config.getContainer()!;
		const items = this.config.getItems();
		const session: Session = {
			item,
			from,
			to: from,
			source,
			items,
			fromContainer,
			target: this.member,
			targetItems: items,
		};
		this.session = session;
		item.setAttribute(SORTABLE_STATE_ATTRIBUTE, 'lifted');
		fromContainer.setAttribute(SORTABLE_ACTIVE_ATTRIBUTE, '');
		this.announce('lift', this.context(session));
		return session;
	}

	private place(session: Session, target: SortableMember, items: HTMLElement[], to: number): void {
		if (session.target === target && session.to === to) {
			return;
		}
		for (const stale of session.targetItems) {
			stale.removeAttribute(SORTABLE_DROP_ATTRIBUTE);
		}
		session.target.getContainer()!.removeAttribute(SORTABLE_OVER_ATTRIBUTE);
		session.target = target;
		session.targetItems = items;
		session.to = to;
		if (target !== this.member) {
			target.getContainer()!.setAttribute(SORTABLE_OVER_ATTRIBUTE, '');
		}
		this.markLanding(session);
		this.announce('move', this.context(session));
	}

	private markLanding(session: Session): void {
		const { to, from, targetItems } = session;
		if (session.target === this.member) {
			if (to !== from) {
				targetItems[to].setAttribute(SORTABLE_DROP_ATTRIBUTE, to > from ? 'after' : 'before');
			}
		} else if (targetItems.length > 0) {
			const beyond = to >= targetItems.length;
			targetItems[beyond ? targetItems.length - 1 : to].setAttribute(
				SORTABLE_DROP_ATTRIBUTE,
				beyond ? 'after' : 'before',
			);
		}
	}

	private drop(session: Session): void {
		const change = this.change(session);
		const context = this.context(session);
		this.end();
		const moved = change.toContainer !== change.fromContainer || change.to !== change.from;
		if (moved && this.config.onChange?.(change) === false) {
			this.announce('cancel', this.returnContext(session, context));
		} else {
			this.announce('drop', context);
		}
	}

	private cancel(session: Session): void {
		const context = this.returnContext(session, this.context(session));
		this.end();
		this.announce('cancel', context);
	}

	private end(): void {
		const session = this.session;
		this.session = null;
		this.candidate = null;
		if (!session) {
			return;
		}
		for (const item of session.targetItems) {
			item.removeAttribute(SORTABLE_DROP_ATTRIBUTE);
		}
		session.target.getContainer()!.removeAttribute(SORTABLE_OVER_ATTRIBUTE);
		session.item.removeAttribute(SORTABLE_STATE_ATTRIBUTE);
		session.item.style.removeProperty(SORTABLE_OFFSET_PROPERTIES.x);
		session.item.style.removeProperty(SORTABLE_OFFSET_PROPERTIES.y);
		session.fromContainer.removeAttribute(SORTABLE_ACTIVE_ATTRIBUTE);
	}

	private context(session: Session): SortableMessageContext {
		const crossed = session.target !== this.member;
		return {
			label: this.config.getLabel?.(session.item) ?? session.item.textContent.trim(),
			from: session.from,
			to: session.to,
			position: session.to + 1,
			total: crossed ? session.targetItems.length + 1 : session.items.length,
			container: session.target.getLabel(),
			fromContainer: this.member.getLabel(),
			crossed,
			containers: this.members().length,
		};
	}

	/** The context of the item back where it started, for a cancel or a refused drop. */
	private returnContext(session: Session, context: SortableMessageContext): SortableMessageContext {
		return {
			...context,
			to: session.from,
			position: session.from + 1,
			total: session.items.length,
			container: context.fromContainer,
			crossed: false,
		};
	}

	private announce(step: keyof SortableMessages, context: SortableMessageContext): void {
		const build = this.config.messages?.[step] ?? DEFAULT_SORTABLE_MESSAGES[step];
		this.config.announce?.(build(context));
	}
}

/**
 * Creates a `SortableController` that attaches when `host` connects and is destroyed when it disconnects.
 *
 * @example
 * ```ts
 * // in a RadiantElement subclass
 * createSortableController(this, {
 *   getContainer: () => this,
 *   getItems: () => [...this.children] as HTMLElement[],
 *   onChange: ({ item, to }) => this.moveItem(item, to),
 * });
 * ```
 */
export function createSortableController(host: ControllerHost, config: SortableControllerConfig): SortableController {
	return bindController(host, new SortableController(config));
}
