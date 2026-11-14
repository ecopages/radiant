import { bindController, type Controller, type ControllerHost } from './controller';
import { closestItem } from './closest-item';
import { EventListenerController } from './event-listener-controller';
import { PortalController } from './portal-controller';
import { PointerDragController, type PointerDragInfo, type PointerDragEnd } from './pointer-drag-controller';
import type { SortableGroup, SortableMember } from './sortable-group';
import { DEFAULT_SORTABLE_MESSAGES, type SortableMessageContext, type SortableMessages } from './sortable-messages';
import {
	findRectIndex,
	resolveContainerKeyIndex,
	resolveGrabOffset,
	resolveInsertIndex,
	resolvePlaceholderSlot,
	resolvePreviewPosition,
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
/** Set on the placeholder that holds the lifted item's slot while `preview` is on. */
export const SORTABLE_PLACEHOLDER_ATTRIBUTE = 'data-sortable-placeholder';
/** Custom properties on the lifted item: how far the pointer moved since the press, in px. Pointer sorts only, and not with `preview`. */
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
	/**
	 * Read on every event, in document order, so the list can change without telling the controller.
	 *
	 * @remarks
	 * With `preview` the placeholder is a child of the container during a sort and the lifted item is not. The
	 * controller drops the placeholder and the lifted item from what it reads, so `getItems` may return the live
	 * children; the owner must not re-render the lists until the sort ends. `onChange` runs after the item is back
	 * in its original place and the placeholder is gone, so a handler written without `preview` works as it is.
	 */
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
	/**
	 * Lifts the item out of its container into a layer while it is sorted, where it follows the pointer, and keeps a
	 * placeholder in its slot. Default `false`: the item stays in place and only gets attributes.
	 *
	 * @remarks
	 * The item is moved by `PortalController`, so it keeps the theme variables of its ancestors and returns to its
	 * place when the sort ends, before `onChange` runs. The controller sets only geometry on the preview (`position`,
	 * `left`, `top`, `width`, `height`, `pointer-events`, `margin`, `box-sizing`); the owner styles `[data-sortable-state='lifted']` and
	 * `[data-sortable-placeholder]`. See `getItems` for what the lists hold during the sort.
	 */
	preview?: boolean;
	/** Where the preview goes. Resolved on every lift. Default `document.body`. Only with `preview`. */
	getPreviewLayer?: () => ParentNode;
	/**
	 * Builds the placeholder that holds the slot. Only with `preview`.
	 *
	 * @remarks Default: an empty `div`. Return an element of the kind the container allows (an `li` in a `ul`), or a clone. Either way it gets the item's width and height, `data-sortable-placeholder` and `aria-hidden`.
	 */
	createPlaceholder?: (item: HTMLElement) => HTMLElement;
	/** Return `false` to ignore presses and keys. */
	getEnabled?: () => boolean;
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

/** What `preview` puts in place for a sort: the placeholder, the portal and the geometry it restores. */
type Preview = {
	placeholder: HTMLElement;
	portal: PortalController;
	grab: { x: number; y: number };
	saved: Map<string, string>;
	/** Keys and focus loss of the item once it left the container. */
	keys: EventListenerController<HTMLElement, 'keydown' | 'focusout'>;
};

const PREVIEW_PROPERTIES = ['position', 'left', 'top', 'width', 'height', 'pointer-events', 'margin', 'box-sizing'];

type Session = Omit<SortableChange, 'toContainer'> & {
	preview: Preview | null;
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
 *   onChange: ({ item, to }) => {
 *     list.insertBefore(item, [...list.children].filter((el) => el !== item)[to] ?? null);
 *   },
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
 *     onChange: ({ item, to, toContainer }) => {
 *       toContainer.insertBefore(item, [...toContainer.children].filter((el) => el !== item)[to] ?? null);
 *     },
 *   });
 * sortable(this.querySelector('#todo')!);
 * sortable(this.querySelector('#done')!);
 * ```
 *
 * @remarks
 * The controller never applies a move (with `preview` it only moves the lifted item aside, see below). It follows the drag, works out where the item would land, and on drop calls
 * `onChange({ item, from, to, source, fromContainer, toContainer })` for the owner to apply (`reorder` in
 * `sortable-order` computes a new array); returning `false` refuses the move. While a sort runs it only sets state
 * for CSS to draw: `data-sortable-active` on the container the item came from, `data-sortable-over` on another
 * container of the group it is over, `data-sortable-state="lifted"` on the item, `data-sortable-drop="before|after"`
 * on the item the lifted one would land beside, and `--sortable-dx` / `--sortable-dy` on the lifted item (pointer
 * travel, for a `transform`). No style is applied without `preview`; with it only the preview geometry (see `preview`). `getState()` returns the sort in progress for owners that draw a
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
 * Preview: with `preview` the lifted item leaves its container while it is sorted. A placeholder (`createPlaceholder`,
 * marked `data-sortable-placeholder`) takes its place and moves to the target slot, across the containers of a
 * group; the item goes to `getPreviewLayer()` (default `document.body`) through `PortalController`, positioned
 * `fixed` at the pointer minus the grip it was pressed with, or on the placeholder for a keyboard sort. Geometry is
 * all the controller styles; colors, shadow, z-index and the look of the placeholder are the owner's CSS. The
 * container and the other lists are read without the placeholder and the lifted item, and `from` in
 * `resolveTargetIndex` is `null`. When the sort ends, by drop, cancel or `destroy()`, the item is back in its
 * original place and the placeholder removed before `onChange` runs, so the owner applies the change exactly as
 * without `preview`. Do not re-render or reorder the lists while a sort runs. Keys reach the item in the layer
 * through a listener on the item itself, and it keeps focus (also back in place on a cancel).
 *
 * The constructor reads nothing. `destroy()` ends a sort in progress without calling `onChange` or announcing,
 * and leaves the group.
 */
export class SortableController implements Controller {
	private candidate: Candidate | null = null;
	private session: Session | null = null;
	/** True while the controller itself moves the lifted item, so the focus change that causes is not a focus loss. */
	private moving = false;

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
			listener: (event) => this.onKeyOrFocus(event),
		});
	}

	private onKeyOrFocus(event: KeyboardEvent | FocusEvent): void {
		if (event instanceof KeyboardEvent) {
			this.onKeydown(event);
		} else {
			this.onFocusOut(event);
		}
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

	private onPress(event: PointerEvent): boolean {
		this.candidate = null;
		if (this.session || this.config.getEnabled?.() === false) {
			return false;
		}
		const items = this.config.getItems();
		const item = closestItem(event.target, items, this.config.getContainer());
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
		const point = { x: info.x, y: info.y };
		const { preview } = session;
		if (preview) {
			const { left, top } = resolvePreviewPosition(point, preview.grab);
			session.item.style.setProperty('left', `${left}px`);
			session.item.style.setProperty('top', `${top}px`);
		} else {
			session.item.style.setProperty(SORTABLE_OFFSET_PROPERTIES.x, `${info.dx}px`);
			session.item.style.setProperty(SORTABLE_OFFSET_PROPERTIES.y, `${info.dy}px`);
		}
		const eligible = this.eligibleTargets(session);
		const hovered = findRectIndex(
			eligible.map((member) => member.getContainer()!.getBoundingClientRect()),
			point,
		);
		const target = hovered === -1 ? session.target : eligible[hovered];
		const items = this.itemsOf(session, target);
		const rects = (preview ? items.filter((item) => item !== session.item) : items).map((item) =>
			item.getBoundingClientRect(),
		);
		const from = target === this.member && !preview ? session.from : null;
		this.place(session, target, items, this.resolveTargetIndex(rects, from, point));
	}

	/**
	 * The items of `target` during the sort: the snapshot taken at the lift for this container, which includes the
	 * lifted item, and what `getItems` returns for another container without the placeholder.
	 */
	private itemsOf(session: Session, target: SortableMember): HTMLElement[] {
		return target === this.member
			? session.items
			: target.getItems().filter((item) => item !== session.preview?.placeholder);
	}

	/**
	 * Decides the index the lifted item takes from where the pointer is. Runs on every pointer move of a sort, over the rects of the items of the container under the pointer.
	 *
	 * @remarks Override to snap to a grid or change where a neighbour gives way. `from` is the item's own index when it is over its own container (its rect is in `rects`), and `null` over another container of the group. Return an index in the reordered list: `0` to `rects.length - 1` over the own container, `0` to `rects.length` over another. With `preview` the lifted item has left its container, so its rect is never in `rects` and `from` is always `null`: `rects` are the other items and the range is `0` to `rects.length`. The default is `resolveSortIndex` and `resolveInsertIndex` with the configured axis.
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
		return Math.hypot(info.dx, info.dy) < threshold
			? null
			: this.lift(this.candidate!, 'pointer', { x: info.startX, y: info.startY });
	}

	private onPointerEnd(end: PointerDragEnd): void {
		const session = this.session;
		this.candidate = null;
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

	/**
	 * @remarks
	 * Ignores keys while a press is pending (`candidate` set, no session yet): a keyboard sort ended then would leave the
	 * pointer drag running with nothing to lift.
	 */
	private onKeydown(event: KeyboardEvent): void {
		const session = this.session;
		if (this.candidate || this.config.getEnabled?.() === false || session?.source === 'pointer') {
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
		const item = closestItem(event.target, items, this.config.getContainer());
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
			const items = this.itemsOf(session, target);
			this.place(session, target, items, Math.min(session.to, this.slotCount(target, items) - 1));
		}
		return true;
	}

	/** How many slots a lifted item can take in `target`: the lifted item's own container still holds it, another container does not. */
	private slotCount(target: SortableMember, items: readonly HTMLElement[]): number {
		return target === this.member ? items.length : items.length + 1;
	}

	private steerIndex(session: Session, event: KeyboardEvent): boolean {
		const slots = this.slotCount(session.target, session.targetItems);
		const next = resolveSortKeyIndex(event.key, session.to, slots, this.config.axis);
		if (next === null) {
			return false;
		}
		this.place(session, session.target, session.targetItems, next);
		return true;
	}

	private onFocusOut(event: FocusEvent): void {
		const session = this.session;
		if (
			!this.moving &&
			session?.source === 'keyboard' &&
			!session.item.contains(event.relatedTarget as Node | null)
		) {
			this.cancel(session);
		}
	}

	private lift({ item, from }: Candidate, source: SortableSource, press = { x: 0, y: 0 }): Session {
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
			preview: null,
		};
		this.session = session;
		if (this.config.preview) {
			session.preview = this.mountPreview(session, press);
		}
		item.setAttribute(SORTABLE_STATE_ATTRIBUTE, 'lifted');
		fromContainer.setAttribute(SORTABLE_ACTIVE_ATTRIBUTE, '');
		this.announce('lift', this.context(session));
		return session;
	}

	/**
	 * Swaps the item for a placeholder and moves it to the layer.
	 *
	 * @remarks
	 * The item loses focus when it moves, and a keyboard sort needs it back: the keys now reach the item itself,
	 * not the container, so `keys` listens on it. `moving` keeps that blur from counting as focus leaving.
	 */
	private mountPreview(session: Session, press: { x: number; y: number }): Preview {
		const { item } = session;
		const rect = item.getBoundingClientRect();
		const placeholder = this.config.createPlaceholder?.(item) ?? document.createElement('div');
		placeholder.style.setProperty('box-sizing', 'border-box');
		placeholder.style.setProperty('width', `${rect.width}px`);
		placeholder.style.setProperty('height', `${rect.height}px`);
		placeholder.setAttribute(SORTABLE_PLACEHOLDER_ATTRIBUTE, '');
		placeholder.setAttribute('aria-hidden', 'true');
		const preview: Preview = {
			placeholder,
			portal: new PortalController({ getNode: () => item, getContainer: this.config.getPreviewLayer }),
			grab: resolveGrabOffset(rect, press),
			saved: new Map(PREVIEW_PROPERTIES.map((name) => [name, item.style.getPropertyValue(name)])),
			keys: new EventListenerController({
				getTarget: () => item,
				type: ['keydown', 'focusout'],
				listener: (event) => this.onKeyOrFocus(event),
			}),
		};
		item.before(placeholder);
		this.keepFocus(() => preview.portal.attach());
		const geometry = { position: 'fixed', margin: '0', 'box-sizing': 'border-box', 'pointer-events': 'none' };
		for (const [name, value] of Object.entries(geometry)) {
			item.style.setProperty(name, value);
		}
		item.style.setProperty('width', `${rect.width}px`);
		item.style.setProperty('height', `${rect.height}px`);
		item.style.setProperty('left', `${rect.left}px`);
		item.style.setProperty('top', `${rect.top}px`);
		preview.keys.attach();
		return preview;
	}

	private unmountPreview(session: Session, preview: Preview): void {
		const { item } = session;
		preview.keys.destroy();
		for (const [name, value] of preview.saved) {
			if (value) {
				item.style.setProperty(name, value);
			} else {
				item.style.removeProperty(name);
			}
		}
		this.keepFocus(() => preview.portal.destroy());
		preview.placeholder.remove();
	}

	/** Runs a move of the lifted item and gives focus back to what had it. */
	private keepFocus(move: () => void): void {
		const focused = document.activeElement;
		this.moving = true;
		move();
		if (focused instanceof HTMLElement && focused.isConnected && document.activeElement !== focused) {
			focused.focus({ preventScroll: true });
		}
		this.moving = false;
	}

	/** Puts the placeholder in the slot of the item's target index, and a keyboard preview on top of it. */
	private movePlaceholder(session: Session, preview: Preview): void {
		const others = session.targetItems.filter((item) => item !== session.item);
		const slot = resolvePlaceholderSlot(others.length, session.to);
		if (slot) {
			others[slot.index][slot.side === 'before' ? 'before' : 'after'](preview.placeholder);
		} else {
			session.target.getContainer()!.append(preview.placeholder);
		}
		if (session.source === 'keyboard') {
			const rect = preview.placeholder.getBoundingClientRect();
			session.item.style.setProperty('left', `${rect.left}px`);
			session.item.style.setProperty('top', `${rect.top}px`);
		}
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
		if (session.preview) {
			this.movePlaceholder(session, session.preview);
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
		if (session.preview) {
			this.unmountPreview(session, session.preview);
		}
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
