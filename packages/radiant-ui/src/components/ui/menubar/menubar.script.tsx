import { RadiantElement, customElement, event, onEvent, prop } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { applyRovingTabindex, navigateRovingTabindex } from '@/lib/roving-tabindex';
import { PopoverController, shouldDismissPopoverPointer } from '../shared/popover-controller';

export type RuiMenubarProps = {
	label?: string;
};

export type RuiMenubarChangeDetail = { value: string };

type RuiMenubarBindings = {
	label: string;
};

/**
 * `<rui-menubar>` — a horizontal menubar of menus.
 *
 * Implements the APG Menubar pattern: top-level items use `role="menuitem"` with
 * `aria-haspopup` / `aria-expanded` when they own a nested `[role="menu"]`. Arrow
 * keys move across the bar; Enter/Space/ArrowDown open the popup; Escape closes it.
 *
 * Expected markup (also produced by the JSX view helper):
 * ```html
 * <div class="rui-menubar__root" data-ref="menubar-root">
 *   <button role="menuitem" aria-haspopup="true" aria-expanded="false">File</button>
 *   <div role="menu" hidden>
 *     <button role="menuitem" data-value="new">New</button>
 *   </div>
 * </div>
 * ```
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
 * @element rui-menubar
 * @attr {string} label - Accessible name for the `role="menubar"` landmark.
 * @slot - Top-level menu roots (`[data-ref="menubar-root"]`), produced by the JSX view helper.
 * @fires rui-change - Emitted when a menu item is activated; `detail.value` is the item's `data-value` or text.
 * @cssclass rui-menubar - Menubar bar (`role="menubar"`).
 */
@customElement('rui-menubar')
export class RuiMenubar extends RadiantElement<RuiMenubarBindings> {
	@prop({ type: String, defaultValue: '' }) label: string;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiMenubarChangeDetail>;

	private readonly resolvedAriaLabel = this.$.label.map((label) => label || undefined);

	private openRoot: HTMLElement | null = null;
	private popoverController: PopoverController | null = null;

	private getTopItems(): HTMLElement[] {
		return Array.from(
			this.querySelectorAll<HTMLElement>('[data-ref="menubar"] > [data-ref="menubar-root"] > [role="menuitem"]'),
		);
	}

	private getMenuFor(topItem: HTMLElement): HTMLElement | null {
		const root = topItem.closest('[data-ref="menubar-root"]');
		return root?.querySelector<HTMLElement>(':scope > [role="menu"]') ?? null;
	}

	private getMenuItems(menu: HTMLElement): HTMLElement[] {
		return Array.from(menu.querySelectorAll<HTMLElement>(':scope > [role="menuitem"]')).filter(
			(item) => item.getAttribute('aria-disabled') !== 'true',
		);
	}

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => applyRovingTabindex(this.getTopItems(), 0));
	}

	override disconnectedCallback(): void {
		this.popoverController?.destroy();
		this.popoverController = null;
		super.disconnectedCallback();
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

		if (focus === 'first') {
			const items = this.getMenuItems(menu);
			applyRovingTabindex(items, 0);
			items[0]?.focus();
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
	@onEvent({ selector: '[data-ref="menubar"] > [data-ref="menubar-root"] > [role="menuitem"]', type: 'keydown' })
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

	@onEvent({ selector: '[data-ref="menubar"] > [data-ref="menubar-root"] > [role="menuitem"]', type: 'click' })
	onTopClick(event: Event): void {
		const current = (event.target as HTMLElement).closest('[role="menuitem"]') as HTMLElement | null;
		if (!current || !this.getTopItems().includes(current)) return;

		if (!this.getMenuFor(current)) {
			this.closeOpenMenu();
			return;
		}

		const expanded = current.getAttribute('aria-expanded') === 'true';
		if (expanded) this.closeOpenMenu();
		else this.openMenu(current, 'first');
	}

	@onEvent({ selector: '[role="menu"] > [role="menuitem"]', type: 'keydown' })
	onMenuKeydown(event: KeyboardEvent): void {
		const menu = (event.target as HTMLElement).closest('[role="menu"]') as HTMLElement | null;
		const current = (event.target as HTMLElement).closest('[role="menuitem"]') as HTMLElement | null;
		if (!menu || !current || !this.contains(menu)) return;

		const items = this.getMenuItems(menu);

		if (event.key === 'Escape') {
			event.preventDefault();
			this.closeOpenMenu(true);
			return;
		}

		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			this.activateItem(current);
			return;
		}

		if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
			const tops = this.getTopItems();
			const top = menu.parentElement?.querySelector<HTMLElement>(':scope > [role="menuitem"]');
			if (!top) return;
			event.preventDefault();
			const result = navigateRovingTabindex({
				items: tops,
				current: top,
				key: event.key,
				orientation: 'horizontal',
			});
			if (result.handled && this.getMenuFor(result.item)) this.openMenu(result.item, 'first');
			return;
		}

		const result = navigateRovingTabindex({
			items,
			current,
			key: event.key,
			orientation: 'vertical',
		});
		if (result.handled) event.preventDefault();
	}

	/**
	 * @remarks Ignores top-level items — they are not direct children of `role="menu"` in this markup.
	 */
	@onEvent({ selector: '[role="menu"] > [role="menuitem"]', type: 'click' })
	onMenuItemClick(event: Event): void {
		const item = (event.target as HTMLElement).closest('[role="menuitem"]') as HTMLElement | null;
		if (!item || !this.contains(item)) return;
		if (item.parentElement?.getAttribute('role') !== 'menu') return;
		this.activateItem(item);
	}

	private activateItem(item: HTMLElement): void {
		const value = item.getAttribute('data-value') || item.textContent?.trim() || '';
		this.changeEvent.emit({ value });
		this.closeOpenMenu(true);
	}

	override render() {
		return (
			<div class="rui-menubar" data-ref="menubar" role="menubar" aria-label={this.resolvedAriaLabel}>
				<slot></slot>
			</div>
		);
	}
}
