import { RadiantElement, bound, customElement, event, onEvent, onUpdated, prop, query } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { PopoverController, shouldDismissPopoverPointer } from '../shared/popover-controller';
import { MenuTreeController } from '../shared/menu-tree';
import type { RuiPlacement } from '../shared/placement';

export type RuiMenuButtonProps = {
	/** Whether the menu starts open. Default: `false`. */
	open?: boolean;
	/** Placement of the menu surface relative to its trigger. Default: `bottom-start`. */
	placement?: RuiPlacement;
};

export type RuiMenuButtonSelectDetail = {
	value: string;
};

const MENU_GAP = 6;

/**
 * `<rui-menu-button>` — a button that opens a menu of actions.
 *
 * Implements the WAI-ARIA APG Menu Button pattern together with the Menu
 * keyboard model: the trigger exposes `aria-haspopup="menu"` and
 * `aria-expanded`, and the popup has `role="menu"` with `role="menuitem"`
 * children.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
 *
 * Keyboard interaction (trigger):
 * - `Enter` / `Space` / `ArrowDown`: open and focus the first item
 * - `ArrowUp`: open and focus the last item
 *
 * Keyboard interaction (open menu):
 * - `ArrowDown` / `ArrowUp`: move between items (wraps)
 * - `Home` / `End`: first / last item
 * - `ArrowRight` / `Enter` / `Space` on a branch: open its submenu and focus its first item
 * - `ArrowLeft` in a submenu: close it and return focus to its branch
 * - `Enter` / `Space` on a leaf: activate it and close the tree
 * - `Escape`: close and return focus to the trigger
 *
 * Nested branch menus open after a 200 ms pointer-hover delay without moving
 * keyboard focus. Pointer travel from a branch into its flyout keeps it open.
 *
 * @remarks When the menu contains `[data-autocomplete-input]`, opening focuses
 * that field so the user can filter items immediately.
 *
 * @element rui-menu-button
 * @attr {boolean} open - Whether the menu starts open. Default: `false`.
 * @attr {('top'|'top-start'|'top-end'|'right'|'right-start'|'right-end'|'bottom'|'bottom-start'|'bottom-end'|'left'|'left-start'|'left-end')} placement - Placement of the menu surface relative to its trigger. Default: `bottom-start`.
 * Compose with `RuiMenuButtonTrigger`, `RuiMenuButtonContent`, and
 * `RuiMenuButtonItem`; use the submenu helpers for nested menus. The
 * `trigger` / recursive `items` API supplies that composition.
 * @fires rui-change - Emitted when a menu item is activated; `detail.value` is the item's `data-value` or text.
 * @fires rui-close - Emitted when the menu closes.
 * @cssclass rui-menu-button - Root wrapper around trigger and menu.
 * @cssclass rui-menu-button__trigger - Menu button trigger (`rui-button--primary`).
 * @cssclass rui-menu-button__chevron - Chevron indicator.
 * @cssclass rui-menu-button__menu - Popup menu surface (`role="menu"`).
 */
@customElement('rui-menu-button')
export class RuiMenuButton extends RadiantElement {
	@prop({ type: Boolean, reflect: true, defaultValue: false }) open: boolean;
	@prop({ type: String, defaultValue: 'bottom-start' }) placement: RuiPlacement;

	@query({ ref: 'trigger' }) triggerTarget: HTMLButtonElement;
	@query({ ref: 'menu' }) menuTarget: HTMLElement;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiMenuButtonSelectDetail>;

	@event({ name: 'rui-close', bubbles: true, composed: true })
	closeEvent: EventEmitter<void>;

	private menuId = `rui-menu-${Math.random().toString(36).slice(2, 9)}`;
	private popoverController: PopoverController | null = null;
	private menuTree: MenuTreeController | null = null;
	private pendingFocus: 'first' | 'last' | 'trigger' | null = null;

	protected override onConnected(): void {
		this.syncOpenState();
	}

	override disconnectedCallback(): void {
		this.menuTree?.destroy();
		this.menuTree = null;
		this.popoverController?.destroy();
		this.popoverController = null;
		super.disconnectedCallback();
	}

	private getItems(): HTMLElement[] {
		if (!this.menuTarget) return [];
		return this.ensureMenuTree().getFocusableItems(this.menuTarget);
	}

	private ensureMenuTree(): MenuTreeController {
		if (!this.menuTree) {
			this.menuTree = new MenuTreeController({
				root: this,
				getRootMenu: () => this.menuTarget,
				onActivate: (item) => this.activateItem(item),
				onCloseRoot: (returnFocus) => this.setOpen(false, returnFocus ? 'trigger' : null),
			});
		}
		return this.menuTree;
	}

	private getSearchInput(): HTMLInputElement | null {
		return this.menuTarget?.querySelector<HTMLInputElement>('[data-autocomplete-input]') ?? null;
	}

	private ensurePopoverController(): PopoverController {
		if (!this.popoverController) {
			this.popoverController = new PopoverController({
				getAnchor: () => this.triggerTarget,
				getFloating: () => this.menuTarget,
				getOpen: () => this.open,
				getPlacement: () => this.placement,
				gap: MENU_GAP,
				portal: false,
			});
		}
		return this.popoverController;
	}

	@bound
	@onUpdated(['open', 'placement'])
	syncOpenState(): void {
		if (!this.triggerTarget || !this.menuTarget) return;

		this.menuTarget.id = this.menuId;
		this.triggerTarget.setAttribute('aria-controls', this.menuId);
		this.triggerTarget.setAttribute('aria-haspopup', 'menu');
		this.triggerTarget.setAttribute('aria-expanded', String(this.open));
		this.menuTarget.toggleAttribute('hidden', !this.open);
		const menuTree = this.ensureMenuTree();
		menuTree.sync();
		if (!this.open) menuTree.closeAll();

		const controller = this.ensurePopoverController();
		controller.updateConfig({
			getPlacement: () => this.placement,
			getOpen: () => this.open,
		});
		controller.sync();

		const focus = this.pendingFocus;
		this.pendingFocus = null;
		if (!focus) return;

		if (focus === 'trigger') {
			this.triggerTarget?.focus();
			return;
		}

		const search = this.getSearchInput();
		if (search) {
			search.focus();
			return;
		}

		if (focus === 'first') this.getItems()[0]?.focus();
		if (focus === 'last') {
			const items = this.getItems();
			items[items.length - 1]?.focus();
		}
	}

	private setOpen(next: boolean, focus: 'first' | 'last' | 'trigger' | null = null): void {
		const wasOpen = this.open;
		this.pendingFocus = focus;
		this.open = next;
		if (wasOpen && !next) this.closeEvent.emit();
		if (wasOpen === next) this.syncOpenState();
	}

	@onEvent({ document: true, type: 'pointerdown' })
	onDocumentPointerDown(event: PointerEvent): void {
		if (!this.open) return;
		const target = event.target as Node | null;
		if (!shouldDismissPopoverPointer(this.triggerTarget, this.menuTarget, target)) return;
		this.setOpen(false);
	}

	@onEvent({ ref: 'trigger', type: 'click' })
	onTriggerClick(): void {
		this.setOpen(!this.open, this.open ? null : 'first');
	}

	@onEvent({ ref: 'trigger', type: 'keydown' })
	onTriggerKeydown(event: KeyboardEvent): void {
		switch (event.key) {
			case 'ArrowDown':
			case 'Enter':
			case ' ':
				event.preventDefault();
				this.setOpen(true, 'first');
				break;
			case 'ArrowUp':
				event.preventDefault();
				this.setOpen(true, 'last');
				break;
			default:
				break;
		}
	}

	@onEvent({ ref: 'menu', type: 'keydown' })
	onMenuKeydown(event: KeyboardEvent): void {
		this.ensureMenuTree().handleKeydown(event);
	}

	@onEvent({ ref: 'menu', type: 'pointerover' })
	onMenuPointerOver(event: PointerEvent): void {
		this.ensureMenuTree().handlePointerOver(event);
	}

	@onEvent({ ref: 'menu', type: 'pointerout' })
	onMenuPointerOut(event: PointerEvent): void {
		this.ensureMenuTree().handlePointerOut(event);
	}

	@onEvent({ ref: 'menu', type: 'focusout' })
	onMenuFocusOut(event: FocusEvent): void {
		this.ensureMenuTree().handleFocusOut(event);
	}

	@onEvent({ selector: '[role="menuitem"]', type: 'click' })
	onItemClick(event: Event): void {
		this.ensureMenuTree().handleClick(event);
	}

	private activateItem(item: HTMLElement): void {
		const value = item.getAttribute('data-value') || item.textContent?.trim() || '';
		this.changeEvent.emit({ value });
		this.setOpen(false, 'trigger');
	}
}
