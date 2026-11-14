import type { JSX_PROPS } from '@ecopages/jsx';
import {
	RadiantElement,
	bindTo,
	bound,
	customElement,
	event,
	onEvent,
	onUpdated,
	prop,
	query,
} from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { PopoverController } from '../../../controllers/popover-controller';
import { createMenuTreeController } from '../../../controllers/menu-tree-controller';
import type { RuiPlacement } from '../../../controllers/placement';
import { uniqueId } from '@/lib/unique-id';

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
 * The custom element is a behavior host: it does not render the composed tree.
 * Import the script and place light-DOM children that match the contract below,
 * or use the `RuiMenuButton*` view helpers which stamp the same targets.
 *
 * Implements the WAI-ARIA APG Menu Button pattern together with the Menu
 * keyboard model.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-ref="trigger"]` — menu button. Host sets `aria-haspopup="menu"`,
 *   `aria-expanded`, `aria-controls`, and `disabled`.
 * - `[data-ref="menu"]` — popup surface (`role="menu"`). Host toggles `hidden`.
 *
 * Per menu item:
 * - `[role="menuitem"]` — action or branch. Host reads `data-value` or text on activate.
 * - `data-value` — optional identity emitted in `rui-change`.
 *
 * Optional:
 * - `[data-autocomplete-input]` — inside the menu; opening focuses this field for filtering.
 * - `[data-ref="submenu-menu"]` — nested flyout (`role="menu"`) sibling of a branch item.
 *
 * Branch pattern: a `[role="menuitem"]` with `aria-haspopup` followed by a sibling
 * `[role="menu"]` or `[data-ref="submenu-menu"]`.
 *
 * Do not set `aria-expanded`, `aria-controls`, or `aria-haspopup` on the trigger —
 * the host owns those.
 *
 * Nested hosts: none.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
 * @element rui-menu-button
 * @attr {boolean} open - Whether the menu starts open. Default: `false`.
 * @attr {('top'|'top-start'|'top-end'|'right'|'right-start'|'right-end'|'bottom'|'bottom-start'|'bottom-end'|'left'|'left-start'|'left-end')} placement - Placement of the menu surface relative to its trigger. Default: `bottom-start`.
 * @fires rui-change - Emitted when a menu item is activated; `detail.value` is the item's `data-value` or text.
 * @fires rui-close - Emitted when the menu closes.
 *
 * @remarks
 * Nested branch menus open after a 200 ms pointer-hover delay without moving
 * keyboard focus. BEM classes live on the view helpers.
 * @cssprop --rui-menu-item-hover - Hover / expanded item fill. Default: `--surface-container-low`.
 */
@customElement('rui-menu-button')
export class RuiMenuButton extends RadiantElement {
	declare readonly [JSX_PROPS]?: RuiMenuButtonProps;

	@prop({ type: Boolean, reflect: true, defaultValue: false })
	@bindTo([
		{ ref: 'trigger', attr: 'aria-expanded' },
		{ ref: 'menu', bool: 'hidden', invert: true },
	])
	open: boolean;

	@prop({ type: String, defaultValue: 'bottom-start' }) placement: RuiPlacement;

	@query({ ref: 'trigger' }) triggerTarget: HTMLButtonElement | null;
	@query({ ref: 'menu' }) menuTarget: HTMLElement | null;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiMenuButtonSelectDetail>;

	@event({ name: 'rui-close', bubbles: true, composed: true })
	closeEvent: EventEmitter<void>;

	private readonly menuTree = createMenuTreeController(this, {
		root: this,
		getRootMenu: () => this.menuTarget,
		onActivate: (item) => this.activateItem(item),
		onCloseRoot: (returnFocus) => this.setOpen(false, returnFocus ? 'trigger' : null),
	});
	private readonly menuId = uniqueId('rui-menu');
	private popoverController: PopoverController | null = null;
	private pendingFocus: 'first' | 'last' | 'trigger' | null = null;

	protected override onConnected(): void {
		this.syncOpenState();
	}

	override disconnectedCallback(): void {
		this.popoverController?.destroy();
		this.popoverController = null;
		super.disconnectedCallback();
	}

	private getItems(): HTMLElement[] {
		if (!this.menuTarget) return [];
		return this.menuTree.getFocusableItems(this.menuTarget);
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
				onDismiss: () => this.setOpen(false),
				dismissOn: ['pointer'],
			});
			this.popoverController.attach();
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
		const menuTree = this.menuTree;
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
		this.menuTree.handleKeydown(event);
	}

	@onEvent({ ref: 'menu', type: 'pointerover' })
	onMenuPointerOver(event: PointerEvent): void {
		this.menuTree.handlePointerOver(event);
	}

	@onEvent({ ref: 'menu', type: 'pointerout' })
	onMenuPointerOut(event: PointerEvent): void {
		this.menuTree.handlePointerOut(event);
	}

	@onEvent({ ref: 'menu', type: 'focusout' })
	onMenuFocusOut(event: FocusEvent): void {
		this.menuTree.handleFocusOut(event);
	}

	@onEvent({ selector: '[role="menuitem"]', type: 'click' })
	onItemClick(event: Event): void {
		this.menuTree.handleClick(event);
	}

	private activateItem(item: HTMLElement): void {
		const value = item.getAttribute('data-value') || item.textContent?.trim() || '';
		this.changeEvent.emit({ value });
		this.setOpen(false, 'trigger');
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'rui-menu-button': RuiMenuButton;
	}
}
