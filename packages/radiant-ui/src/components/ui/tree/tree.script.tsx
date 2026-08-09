import { RadiantElement, customElement, event, onEvent, onUpdated, prop } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { applyRovingTabindex, focusRovingItem, navigateRovingTabindex } from '@/lib/roving-tabindex';

export type RuiTreeProps = {
	label?: string;
	/** Selected tree item `data-value` / id. */
	value?: string;
};

export type RuiTreeChangeDetail = { value: string };

type RuiTreeBindings = {
	label: string;
};

/**
 * `<rui-tree>` — a hierarchical list of tree items.
 *
 * Implements a single-select APG Tree View with Arrow key navigation,
 * Home/End, parent navigation on ArrowLeft, and Enter/Space to select.
 * Expand/collapse is handled with ArrowRight/ArrowLeft (and `*` for siblings);
 * click or Enter on a parent also toggles expansion.
 *
 * @summary Single-select tree with roving-tabindex keyboard navigation.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
 *
 * @element rui-tree
 *
 * @attr {string} label - Accessible name for the tree.
 * @attr {string} value - Selected item's `data-value` / id. Default: `''`.
 *
 * @slot - Tree items authored as `role="treeitem"` markup. Use the `RuiTree`
 *   view (`nodes`) or author light-DOM items directly.
 *
 * @fires rui-change - Emitted with `{ value }` when a tree item is selected.
 *
 * @cssclass rui-tree - Root list (`role="tree"`).
 *
 * @remarks
 * Item-level classes (`rui-tree__item`, `rui-tree__node`) are authored by the
 * `RuiTree` view. Expand/collapse mutates `aria-expanded` and `hidden` on the
 * authored `role="group"` containers.
 */
@customElement('rui-tree')
export class RuiTree extends RadiantElement<RuiTreeBindings> {
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiTreeChangeDetail>;

	private readonly resolvedAriaLabel = this.$.label.map((label) => label || undefined);

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

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => {
			this.syncExpanded();
			this.syncSelection();
		});
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

		switch (event.key) {
			case 'ArrowDown':
			case 'ArrowUp':
			case 'Home':
			case 'End': {
				const result = navigateRovingTabindex({
					items: this.getVisibleItems(),
					current,
					key: event.key,
					orientation: 'vertical',
					wrap: false,
				});
				if (!result.handled) return;
				event.preventDefault();
				break;
			}
			case 'ArrowRight': {
				event.preventDefault();
				if (current.getAttribute('aria-expanded') === 'false') {
					this.setExpanded(current, true);
					return;
				}
				if (current.getAttribute('aria-expanded') === 'true') {
					const items = this.getVisibleItems();
					const index = items.indexOf(current);
					if (items[index + 1]) focusRovingItem(items, index + 1);
				}
				break;
			}
			case 'ArrowLeft': {
				event.preventDefault();
				if (current.getAttribute('aria-expanded') === 'true') {
					this.setExpanded(current, false);
					return;
				}
				const parent = this.getParentItem(current);
				if (parent) {
					const nextItems = this.getVisibleItems();
					const parentIndex = nextItems.indexOf(parent);
					if (parentIndex >= 0) focusRovingItem(nextItems, parentIndex);
				}
				break;
			}
			case '*': {
				event.preventDefault();
				for (const sibling of this.getSiblingItems(current)) {
					if (sibling.hasAttribute('aria-expanded')) {
						this.setExpanded(sibling, true);
					}
				}
				break;
			}
			case 'Enter': {
				event.preventDefault();
				if (current.hasAttribute('aria-expanded')) {
					this.setExpanded(current, current.getAttribute('aria-expanded') !== 'true');
				}
				this.select(current);
				break;
			}
			case ' ': {
				event.preventDefault();
				this.select(current);
				break;
			}
			default:
				break;
		}
	}

	override render() {
		return (
			<ul class="rui-tree" role="tree" aria-label={this.resolvedAriaLabel} aria-multiselectable="false">
				<slot></slot>
			</ul>
		);
	}
}
