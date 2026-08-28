import { RadiantElement, customElement, event, onEvent, onUpdated, prop } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { applyRovingTabindex, focusRovingItem, navigateRovingTabindex } from '@/lib/roving-tabindex';

export type RuiTreeProps = {
	label?: string;
	/** Selected tree item `data-value` / id. */
	value?: string;
};

export type RuiTreeChangeDetail = { value: string };

/**
 * `<rui-tree>` — single-select hierarchical list with expand/collapse.
 *
 * The custom element is a behavior host: it does not render the tree. Import the
 * script and place light-DOM children that match the contract below, or use
 * `RuiTree` with a `nodes` structure or authored children inside the root list.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[role="tree"]` — root list container. Host reads it for sibling scoping; the
 *   view sets `aria-label` and `aria-multiselectable="false"`.
 * - `[role="treeitem"]` — one node. Host sets `aria-selected` and roving `tabIndex`.
 *
 * Per item:
 * - `data-value` — selection identity. Falls back to `id`, then trimmed text.
 *
 * Optional (branch nodes):
 * - `aria-expanded` on a treeitem — when present, the host toggles the adjacent
 *   `[role="group"]` sibling's `hidden` and responds to ArrowRight/Left and `*`.
 * - `[role="group"]` — child list container immediately following an expandable
 *   treeitem. Host writes `hidden` from `aria-expanded`.
 *
 * Do not set `aria-selected` or `tabIndex` on treeitems — the host owns those.
 * Author initial `aria-expanded` and `hidden` on groups for the starting state.
 *
 * Nested hosts: none.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
 * @element rui-tree
 * @attr {string} label - Accessible name for the tree (applied on `[role="tree"]` by the view).
 * @attr {string} value - Selected item `data-value` / id. Default: `''`.
 * @fires rui-change - Emitted with `{ value }` when a tree item is selected.
 *
 * @remarks
 * Minimum tree: `[role="tree"]` > `li` > `[role="treeitem"][data-value]`; branch
 * nodes add `[role="group"]` > nested items after the expandable treeitem.
 * BEM classes live on the `RuiTree` view; the host never queries them.
 */
@customElement('rui-tree')
export class RuiTree extends RadiantElement {
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiTreeChangeDetail>;

	private getVisibleItems(): HTMLElement[] {
		return Array.from(this.querySelectorAll<HTMLElement>('[role="treeitem"]')).filter((item) => {
			let node: HTMLElement | null = item.parentElement;
			while (node && node !== this) {
				if (node.getAttribute('role') === 'group' && node.hidden) {
					return false;
				}
				node = node.parentElement;
			}
			return true;
		});
	}

	private getParentItem(item: HTMLElement): HTMLElement | null {
		const group = item.closest('[role="group"]');
		if (!group) return null;
		const parent = group.previousElementSibling as HTMLElement | null;
		return parent?.getAttribute('role') === 'treeitem' ? parent : null;
	}

	/** Same-level treeitems as `item` (for `*` expand-siblings). */
	private getSiblingItems(item: HTMLElement): HTMLElement[] {
		const parent = this.getParentItem(item);
		const container = parent
			? parent.nextElementSibling?.getAttribute('role') === 'group'
				? (parent.nextElementSibling as HTMLElement)
				: null
			: (this.querySelector<HTMLElement>('[role="tree"]') ?? this);

		if (!container) return [];

		return Array.from(
			container.querySelectorAll<HTMLElement>(':scope > li > [role="treeitem"], :scope > [role="treeitem"]'),
		);
	}

	private syncSelection(): void {
		const items = Array.from(this.querySelectorAll<HTMLElement>('[role="treeitem"]'));
		const visible = this.getVisibleItems();
		let activeIndex = 0;

		items.forEach((item, i) => {
			const id = item.getAttribute('data-value') || item.id || '';
			const selected = Boolean(this.value) && id === this.value;
			item.setAttribute('aria-selected', String(selected));
			if (selected) {
				const vis = visible.indexOf(item);
				if (vis >= 0) activeIndex = vis;
			} else if (!this.value && i === 0) {
				activeIndex = 0;
			}
		});

		applyRovingTabindex(visible, activeIndex);
	}

	private syncExpanded(): void {
		const items = Array.from(this.querySelectorAll<HTMLElement>('[role="treeitem"]'));
		for (const item of items) {
			if (!item.hasAttribute('aria-expanded')) continue;
			const group = item.nextElementSibling as HTMLElement | null;
			if (group?.getAttribute('role') === 'group') {
				group.hidden = item.getAttribute('aria-expanded') === 'false';
			}
		}
	}

	protected override onConnected(): void {
		this.syncExpanded();
		this.syncSelection();
	}

	@onUpdated('value')
	onValueUpdated(): void {
		this.syncSelection();
	}

	private select(item: HTMLElement): void {
		const value = item.getAttribute('data-value') || item.id || item.textContent?.trim() || '';
		this.value = value;
		this.syncSelection();
		this.changeEvent.emit({ value });
		item.focus();
	}

	private setExpanded(item: HTMLElement, expanded: boolean): void {
		item.setAttribute('aria-expanded', String(expanded));
		const group = item.nextElementSibling as HTMLElement | null;
		if (group?.getAttribute('role') === 'group') group.hidden = !expanded;
		this.syncSelection();
	}

	@onEvent({ selector: '[role="treeitem"]', type: 'click' })
	onClick(event: Event): void {
		const item = (event.target as HTMLElement).closest('[role="treeitem"]') as HTMLElement | null;
		if (!item || !this.contains(item)) return;
		if (item.hasAttribute('aria-expanded')) {
			this.setExpanded(item, item.getAttribute('aria-expanded') !== 'true');
		}
		this.select(item);
	}

	@onEvent({ selector: '[role="treeitem"]', type: 'keydown' })
	onKeydown(event: KeyboardEvent): void {
		const current = (event.target as HTMLElement).closest('[role="treeitem"]') as HTMLElement | null;
		if (!current) return;
		const handler = this.treeKeyHandlers[event.key];
		if (!handler?.call(this, current, event)) return;
		event.preventDefault();
	}

	private readonly treeKeyHandlers: Record<string, (item: HTMLElement, event: KeyboardEvent) => boolean> = {
		ArrowDown: this.navigateTreeItem,
		ArrowUp: this.navigateTreeItem,
		Home: this.navigateTreeItem,
		End: this.navigateTreeItem,
		ArrowRight: this.expandOrEnterChild,
		ArrowLeft: this.collapseOrFocusParent,
		'*': this.expandSiblings,
		Enter: this.toggleAndSelect,
		' ': this.selectTreeItem,
	};

	private navigateTreeItem(current: HTMLElement, event: KeyboardEvent): boolean {
		return navigateRovingTabindex({
			items: this.getVisibleItems(),
			current,
			key: event.key,
			orientation: 'vertical',
			wrap: false,
		}).handled;
	}

	private expandOrEnterChild(current: HTMLElement): boolean {
		if (current.getAttribute('aria-expanded') === 'false') {
			this.setExpanded(current, true);
			return true;
		}
		if (current.getAttribute('aria-expanded') !== 'true') return false;
		this.focusAdjacentVisibleItem(current, 1);
		return true;
	}

	private collapseOrFocusParent(current: HTMLElement): boolean {
		if (current.getAttribute('aria-expanded') === 'true') {
			this.setExpanded(current, false);
			return true;
		}
		const parent = this.getParentItem(current);
		if (parent) this.focusVisibleItem(parent);
		return Boolean(parent);
	}

	private expandSiblings(current: HTMLElement): boolean {
		for (const sibling of this.getSiblingItems(current)) {
			if (sibling.hasAttribute('aria-expanded')) this.setExpanded(sibling, true);
		}
		return true;
	}

	private toggleAndSelect(current: HTMLElement): boolean {
		if (current.hasAttribute('aria-expanded'))
			this.setExpanded(current, current.getAttribute('aria-expanded') !== 'true');
		this.select(current);
		return true;
	}

	private selectTreeItem(current: HTMLElement): boolean {
		this.select(current);
		return true;
	}

	private focusAdjacentVisibleItem(current: HTMLElement, direction: 1 | -1): void {
		const items = this.getVisibleItems();
		const index = items.indexOf(current);
		if (items[index + direction]) focusRovingItem(items, index + direction);
	}

	private focusVisibleItem(item: HTMLElement): void {
		const items = this.getVisibleItems();
		const index = items.indexOf(item);
		if (index >= 0) focusRovingItem(items, index);
	}
}
