import { navigateRovingTabindex, type RovingNavResult, type RovingOrientation } from '@/lib/roving-tabindex';
import { bindController, type Controller, type ControllerHost } from './controller';
import { EventListenerController } from './event-listener-controller';

export type RovingControllerConfig = {
	/** Read on every event and sync, so the collection can change (hidden, disabled or added items) without telling the controller. */
	getItems: () => HTMLElement[];
	/** The element that receives `keydown` and `focusin`: the host (`() => this`) or an inner element. */
	getTarget: () => HTMLElement | null;
	/** Which arrows move the active item, with Home and End. `none` handles no keys and leaves them to the component. Default `horizontal`. */
	orientation?: RovingOrientation | 'none';
	/** Wrap past the first or last item. Default `true`. */
	wrap?: boolean;
	/** Return `false` to ignore keys and focus, such as an embedded collection whose owner handles focus. */
	enabled?: () => boolean;
	/** Called after a key moved focus to `item`, so the component can select it or open its menu. */
	onMove?: (item: HTMLElement, event: KeyboardEvent) => void;
};

/**
 * Roving tabindex for a collection: one item is tabbable, arrows and Home/End move focus between items.
 *
 * @remarks
 * Owns the active item and the `tabindex` of every item `getItems()` returns (`0` for the active one, `-1` for
 * the rest), and listens on `getTarget()` for `keydown` and `focusin`. Focus entering an item makes it the active
 * one, so a click or a programmatic `focus()` moves the tab stop too. The pure functions it composes live in
 * `lib/roving-tabindex` and stay usable alone.
 *
 * Selection is the component's: moving focus does not select. Use `onMove` to select on move (tabs with automatic
 * activation, a single-select listbox). Keys outside the configured axis and Home/End are the only ones consumed
 * (`preventDefault`), so Enter, Space, typeahead and expand/collapse keys stay with the component. A key pressed on
 * an element that is not an item, or inside a nested collection, is ignored.
 *
 * The constructor reads nothing. `sync()` is not called on `attach()` because core runs connected callbacks before
 * attributes and children settle: call it from `onConnected` and whenever the items or the preferred active item
 * change. `destroy()` removes the listeners and forgets the active item but leaves `tabindex` as it is.
 *
 * Two-dimensional collections (grid, treegrid, table) use `orientation: 'none'` with all cells as one flat item
 * list: the controller owns the tab stop and the component keeps its own row/column arithmetic and calls `focus()`.
 */
export class RovingController implements Controller {
	private active: HTMLElement | null = null;

	private readonly listener: EventListenerController<HTMLElement, 'keydown' | 'focusin'>;

	constructor(private readonly config: RovingControllerConfig) {
		this.listener = new EventListenerController<HTMLElement, 'keydown' | 'focusin'>({
			getTarget: config.getTarget,
			type: ['keydown', 'focusin'],
			listener: (event) => {
				if (event instanceof KeyboardEvent) {
					this.onKeydown(event);
				} else {
					this.onFocusIn(event);
				}
			},
		});
	}

	attach(): void {
		this.listener.attach();
	}

	destroy(): void {
		this.listener.destroy();
		this.active = null;
	}

	/** The item that holds the tab stop, or `null` before the first `sync()`, `setActive()` or focus. */
	getActive(): HTMLElement | null {
		return this.active;
	}

	/**
	 * Re-reads the items and applies tabindex: `preferred` when it is an item, else the item that was active, else
	 * the first one.
	 *
	 * @returns The active item, or `null` when there are no items.
	 */
	sync(preferred?: HTMLElement | null): HTMLElement | null {
		const items = this.config.getItems();
		const next = this.pick(items, preferred);
		this.apply(items, next);
		return next;
	}

	/** Moves the tab stop to `item` without moving focus. An element that is not an item is ignored. */
	setActive(item: HTMLElement): void {
		if (this.config.getItems().includes(item)) {
			this.sync(item);
		}
	}

	/** Moves the tab stop to `item` and focuses it. An element that is not an item is ignored. */
	focus(item: HTMLElement): void {
		const items = this.config.getItems();
		if (!items.includes(item)) {
			return;
		}
		this.apply(items, item);
		item.focus();
	}

	/**
	 * Moves focus from `current` as `key` says, with the configured orientation and wrap.
	 *
	 * @remarks For a key the component decides to route itself, such as Left/Right on an open menu that switches the
	 * menubar's top-level item. Returns `{ handled: false }` for `orientation: 'none'`.
	 */
	navigate(current: HTMLElement | null, key: string): RovingNavResult {
		const { orientation = 'horizontal', wrap = true } = this.config;
		if (orientation === 'none') {
			return { handled: false };
		}
		const result = navigateRovingTabindex({ items: this.config.getItems(), current, key, orientation, wrap });
		if (result.handled) {
			this.active = result.item;
		}
		return result;
	}

	private pick(items: HTMLElement[], preferred?: HTMLElement | null): HTMLElement | null {
		if (preferred && items.includes(preferred)) {
			return preferred;
		}
		if (this.active && items.includes(this.active)) {
			return this.active;
		}
		return items[0] ?? null;
	}

	private apply(items: HTMLElement[], active: HTMLElement | null): void {
		this.active = active;
		for (const item of items) {
			const tabIndex = item === active ? 0 : -1;
			if (item.tabIndex !== tabIndex) {
				item.tabIndex = tabIndex;
			}
		}
	}

	private findItem(items: HTMLElement[], target: EventTarget | null): HTMLElement | null {
		const root = this.config.getTarget();
		let node = target instanceof Element ? target : null;
		while (node) {
			if (node instanceof HTMLElement && items.includes(node)) {
				return node;
			}
			if (node === root) {
				return null;
			}
			node = node.parentElement;
		}
		return null;
	}

	private onKeydown(event: KeyboardEvent): void {
		if (this.config.enabled?.() === false) {
			return;
		}
		const current = this.findItem(this.config.getItems(), event.target);
		const result = this.navigate(current, event.key);
		if (!result.handled) {
			return;
		}
		event.preventDefault();
		this.config.onMove?.(result.item, event);
	}

	private onFocusIn(event: FocusEvent): void {
		if (this.config.enabled?.() === false) {
			return;
		}
		const items = this.config.getItems();
		const item = this.findItem(items, event.target);
		if (item && item !== this.active) {
			this.apply(items, item);
		}
	}
}

/** Creates a `RovingController` that attaches when `host` connects and is destroyed when it disconnects. */
export function createRovingController(host: ControllerHost, config: RovingControllerConfig): RovingController {
	return bindController(host, new RovingController(config));
}
