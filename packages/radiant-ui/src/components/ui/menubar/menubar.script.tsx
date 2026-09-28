import { RadiantElement, customElement, event, onEvent, prop } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { applyRovingTabindex, navigateRovingTabindex } from '@/lib/roving-tabindex';
import { PopoverController, shouldDismissPopoverPointer } from '../shared/popover-controller';
import { MenuTreeController } from '../shared/menu-tree';

export type RuiMenubarProps = {
	label?: string;
};

export type RuiMenubarChangeDetail = { value: string };

/**
 * `<rui-menubar>` — a horizontal menubar of menus.
 *
 * The custom element is a behavior host: it does not render the composed tree.
 * Import the script and place light-DOM children that match the contract below,
 * or use the `RuiMenubar*` view helpers which stamp the same targets.
 *
 * Implements the APG Menubar pattern: top-level items use `role="menuitem"` with
 * `aria-haspopup` / `aria-expanded` when they own a nested `[role="menu"]`.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-ref="root"]` — menubar landmark shell (`role="menubar"`).
 * - `[data-ref="menubar-root"]` — one top-level menu block (trigger + popup).
 * - `[role="menuitem"]` — top-level item inside each `menubar-root`. Host sets
 *   `aria-expanded` and `aria-haspopup` when a sibling `[role="menu"]` exists.
 * - `[role="menu"]` — popup surface, direct child of `menubar-root`. Host toggles
 *   `hidden` and positions via popover controller.
 *
 * Per menu item (at any depth):
 * - `[role="menuitem"]` — action or branch. Host reads `data-value` or text on activate.
 * - `data-value` — optional identity emitted in `rui-change`.
 *
 * Branch pattern: a `[role="menuitem"]` with `aria-haspopup` followed by a sibling
 * `[role="menu"]` (or `[data-ref="submenu-menu"]` in nested flyouts).
 *
 * Do not set `aria-expanded` on top-level items — the host owns it.
 *
 * Nested hosts: none.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
 * @element rui-menubar
 * @attr {string} label - Accessible name for the `role="menubar"` landmark.
 * @fires rui-change - Emitted when a menu item is activated; `detail.value` is the item's `data-value` or text.
 *
 * @remarks
 * Minimum tree:
 *
 * ```html
 * <div data-ref="root" role="menubar">
 *   <div data-ref="menubar-root">
 *     <button role="menuitem" aria-haspopup="true">File</button>
 *     <div role="menu" hidden>
 *       <button role="menuitem" data-value="new">New</button>
 *     </div>
 *   </div>
 * </div>
 * ```
 *
 * BEM classes live on the view helpers; the host never queries them.
 * @cssprop --rui-menu-item-hover - Hover / expanded item fill. Default: `--surface-container-low`.
 */
@customElement('rui-menubar')
export class RuiMenubar extends RadiantElement {
	@prop({ type: String, defaultValue: '' }) label: string;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiMenubarChangeDetail>;

	private openRoot: HTMLElement | null = null;
	private popoverController: PopoverController | null = null;
	private menuTree: MenuTreeController | null = null;

	private getTopItems(): HTMLElement[] {
		return Array.from(
			this.querySelectorAll<HTMLElement>('[data-ref="root"] > [data-ref="menubar-root"] > [role="menuitem"]'),
		);
	}

	private getMenuFor(topItem: HTMLElement): HTMLElement | null {
		const root = topItem.closest('[data-ref="menubar-root"]');
		return root?.querySelector<HTMLElement>(':scope > [role="menu"]') ?? null;
	}

	protected override onConnected(): void {
		applyRovingTabindex(this.getTopItems(), 0);
		this.ensureMenuTree().sync();
	}

	override disconnectedCallback(): void {
		this.menuTree?.destroy();
		this.menuTree = null;
		this.popoverController?.destroy();
		this.popoverController = null;
		super.disconnectedCallback();
	}

	private ensureMenuTree(): MenuTreeController {
		if (!this.menuTree) {
			this.menuTree = new MenuTreeController({
				root: this,
				getRootMenu: () => this.getOpenMenuSurface(),
				onActivate: (item) => this.activateItem(item),
				onCloseRoot: (returnFocus) => this.closeOpenMenu(returnFocus),
			});
		}
		return this.menuTree;
	}

	private getOpenMenuAnchor(): HTMLElement | null {
		if (!this.openRoot) {
			return null;
		}
		return this.openRoot.querySelector<HTMLElement>(':scope > [role="menuitem"]');
	}

	private getOpenMenuSurface(): HTMLElement | null {
		if (!this.openRoot) {
			return null;
		}
		return this.openRoot.querySelector<HTMLElement>(':scope > [role="menu"]');
	}

	private syncOpenMenuPosition(): void {
		const anchor = this.getOpenMenuAnchor();
		const menu = this.getOpenMenuSurface();
		if (!anchor || !menu) {
			return;
		}

		if (!this.popoverController) {
			this.popoverController = new PopoverController({
				getAnchor: () => this.getOpenMenuAnchor(),
				getFloating: () => this.getOpenMenuSurface(),
				getOpen: () => Boolean(this.openRoot),
				getPlacement: () => 'bottom-start',
				gap: 6,
				portal: false,
			});
		}

		this.popoverController.updateConfig({
			getAnchor: () => this.getOpenMenuAnchor(),
			getFloating: () => this.getOpenMenuSurface(),
			getOpen: () => Boolean(this.openRoot),
		});
		this.popoverController.sync();
	}

	private closeOpenMenu(returnFocus = false): void {
		if (!this.openRoot) return;
		this.menuTree?.closeAll();
		const top = this.openRoot.querySelector<HTMLElement>(':scope > [role="menuitem"]');
		const menu = this.openRoot.querySelector<HTMLElement>(':scope > [role="menu"]');
		if (top) top.setAttribute('aria-expanded', 'false');
		if (menu) menu.hidden = true;
		this.openRoot = null;
		this.popoverController?.teardown();
		if (returnFocus && top) top.focus();
	}

	private openMenu(topItem: HTMLElement, focus: 'first' | null = 'first'): void {
		const root = topItem.closest('[data-ref="menubar-root"]') as HTMLElement | null;
		const menu = this.getMenuFor(topItem);
		if (!root || !menu) return;

		if (this.openRoot && this.openRoot !== root) this.closeOpenMenu();

		topItem.setAttribute('aria-expanded', 'true');
		menu.hidden = false;
		this.openRoot = root;
		this.syncOpenMenuPosition();
		this.ensureMenuTree().sync();

		if (focus === 'first') {
			this.ensureMenuTree().getFocusableItems(menu)[0]?.focus();
		}
	}

	@onEvent({ document: true, type: 'pointerdown' })
	onDocumentPointerDown(event: PointerEvent): void {
		if (!this.openRoot) return;
		if (!shouldDismissPopoverPointer(this.getOpenMenuAnchor(), this.getOpenMenuSurface(), event.target as Node)) {
			return;
		}
		this.closeOpenMenu();
	}

	/**
	 * @remarks When a menu is open, roving focus across the bar opens the newly focused menu (APG).
	 */
	@onEvent({ selector: '[data-ref="root"] > [data-ref="menubar-root"] > [role="menuitem"]', type: 'keydown' })
	onTopKeydown(event: KeyboardEvent): void {
		const items = this.getTopItems();
		const current = (event.target as HTMLElement).closest('[role="menuitem"]') as HTMLElement | null;
		if (!current || !items.includes(current)) return;

		if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
			if (this.getMenuFor(current)) {
				event.preventDefault();
				this.openMenu(current, 'first');
			}
			return;
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			this.closeOpenMenu(true);
			return;
		}

		const result = navigateRovingTabindex({
			items,
			current,
			key: event.key,
			orientation: 'horizontal',
		});
		if (!result.handled) return;
		event.preventDefault();

		if (this.openRoot) {
			if (this.getMenuFor(result.item)) this.openMenu(result.item, 'first');
			else this.closeOpenMenu();
		}
	}

	@onEvent({ selector: '[data-ref="root"] > [data-ref="menubar-root"] > [role="menuitem"]', type: 'click' })
	onTopClick(event: Event): void {
		const current = (event.target as HTMLElement).closest('[role="menuitem"]') as HTMLElement | null;
		if (!current || !this.getTopItems().includes(current)) return;

		if (!this.getMenuFor(current)) {
			this.closeOpenMenu();
			return;
		}

		const expanded = current.getAttribute('aria-expanded') === 'true';
		if (expanded) this.closeOpenMenu();
		else this.openMenu(current, null);
	}

	/**
	 * @remarks MenuTree handles in-menu keys. Left/Right that it does not consume
	 * switch the open top-level menu (APG menubar).
	 */
	@onEvent({ selector: '[role="menu"] > [role="menuitem"]', type: 'keydown' })
	onMenuKeydown(event: KeyboardEvent): void {
		const menu = (event.target as HTMLElement).closest('[role="menu"]') as HTMLElement | null;
		const current = (event.target as HTMLElement).closest('[role="menuitem"]') as HTMLElement | null;
		if (!menu || !current || !this.contains(menu)) return;

		if (this.ensureMenuTree().handleKeydown(event)) return;
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

		const top = this.getOpenMenuAnchor();
		if (!top) return;
		event.preventDefault();
		const result = navigateRovingTabindex({
			items: this.getTopItems(),
			current: top,
			key: event.key,
			orientation: 'horizontal',
		});
		if (result.handled && this.getMenuFor(result.item)) this.openMenu(result.item, 'first');
	}

	/**
	 * @remarks Ignores top-level items — they are not direct children of `role="menu"` in this markup.
	 */
	@onEvent({ selector: '[role="menu"] > [role="menuitem"]', type: 'click' })
	onMenuItemClick(event: Event): void {
		this.ensureMenuTree().handleClick(event);
	}

	@onEvent({ selector: '[role="menuitem"]', type: 'pointerover' })
	onPointerOver(event: PointerEvent): void {
		const target = event.target as HTMLElement | null;
		const top = target?.closest<HTMLElement>('[data-ref="menubar-root"] > [role="menuitem"]');
		if (top && this.getTopItems().includes(top) && this.openRoot && this.getMenuFor(top)) {
			const currentRoot = top.closest('[data-ref="menubar-root"]');
			if (currentRoot && currentRoot !== this.openRoot) this.openMenu(top, null);
			return;
		}
		this.ensureMenuTree().handlePointerOver(event);
	}

	@onEvent({ selector: '[role="menuitem"]', type: 'pointerout' })
	onPointerOut(event: PointerEvent): void {
		this.ensureMenuTree().handlePointerOut(event);
	}

	@onEvent({ selector: '[role="menuitem"]', type: 'focusout' })
	onFocusOut(event: FocusEvent): void {
		this.ensureMenuTree().handleFocusOut(event);
	}

	private activateItem(item: HTMLElement): void {
		const value = item.getAttribute('data-value') || item.textContent?.trim() || '';
		this.changeEvent.emit({ value });
		this.closeOpenMenu(true);
	}
}
