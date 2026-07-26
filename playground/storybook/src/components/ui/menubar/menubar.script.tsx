import { RadiantElement, customElement, event, onEvent, prop } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { applyRovingTabindex, navigateRovingTabindex } from '../../../lib/roving-tabindex';

export type RuiMenubarProps = {
	label?: string;
};

export type RuiMenubarChangeDetail = { value: string };

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
 * @fires rui-change
 */
@customElement('rui-menubar')
export class RuiMenubar extends RadiantElement {
	@prop({ type: String, defaultValue: '' }) label: string;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiMenubarChangeDetail>;

	private openRoot: HTMLElement | null = null;

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

	private closeOpenMenu(returnFocus = false): void {
		if (!this.openRoot) return;
		const top = this.openRoot.querySelector<HTMLElement>(':scope > [role="menuitem"]');
		const menu = this.openRoot.querySelector<HTMLElement>(':scope > [role="menu"]');
		if (top) top.setAttribute('aria-expanded', 'false');
		if (menu) menu.hidden = true;
		this.openRoot = null;
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

		if (focus === 'first') {
			const items = this.getMenuItems(menu);
			applyRovingTabindex(items, 0);
			items[0]?.focus();
		}
	}

	@onEvent({ document: true, type: 'click' })
	onDocumentClick(event: MouseEvent): void {
		if (!this.openRoot) return;
		if (!this.contains(event.target as Node)) this.closeOpenMenu();
	}

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

		// APG: when a menu is open, moving across the bar opens the newly focused menu.
		if (this.openRoot) {
			if (this.getMenuFor(result.item)) this.openMenu(result.item, 'first');
			else this.closeOpenMenu();
		}
	}

	@onEvent({ selector: '[data-ref="menubar"] > [data-ref="menubar-root"] > [role="menuitem"]', type: 'click' })
	onTopClick(event: Event): void {
		const current = (event.target as HTMLElement).closest('[role="menuitem"]') as HTMLElement | null;
		if (!current || !this.getTopItems().includes(current)) return;
		if (!this.getMenuFor(current)) return;

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

	@onEvent({ selector: '[role="menu"] > [role="menuitem"]', type: 'click' })
	onMenuItemClick(event: Event): void {
		const item = (event.target as HTMLElement).closest('[role="menuitem"]') as HTMLElement | null;
		if (!item || !this.contains(item)) return;
		// Ignore top-level items (they are not direct children of role=menu in our markup).
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
			<div class="rui-menubar" data-ref="menubar" role="menubar" aria-label={this.label || undefined}>
				<slot></slot>
			</div>
		);
	}
}
