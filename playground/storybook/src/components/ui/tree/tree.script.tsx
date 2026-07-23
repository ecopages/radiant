import { onUpdated } from '@ecopages/radiant';
import { RadiantElement } from '@ecopages/radiant/core/radiant-element';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { event } from '@ecopages/radiant/decorators/event';
import { onEvent } from '@ecopages/radiant/decorators/on-event';
import { prop } from '@ecopages/radiant/decorators/prop';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { applyRovingTabindex, focusRovingItem, navigateRovingTabindex } from '../../../lib/roving-tabindex';

export type RuiTreeProps = {
	label?: string;
	/** Selected tree item `data-value` / id. */
	value?: string;
};

export type RuiTreeChangeDetail = { value: string };

/**
 * `<rui-tree>` — a hierarchical list of tree items.
 *
 * Implements a single-select APG Tree View with Arrow key navigation,
 * Home/End, parent navigation on ArrowLeft, and Enter/Space to expand/collapse
 * or select.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
 * @element rui-tree
 * @fires rui-change
 */
@customElement('rui-tree')
export class RuiTree extends RadiantElement {
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiTreeChangeDetail>;

	private getVisibleItems(): HTMLElement[] {
		return Array.from(this.querySelectorAll<HTMLElement>('[role="treeitem"]')).filter((item) => {
			const group = item.closest('[role="group"]');
			if (!group) return true;
			const parent = group.previousElementSibling as HTMLElement | null;
			return !parent || parent.getAttribute('aria-expanded') !== 'false';
		});
	}

	private getParentItem(item: HTMLElement): HTMLElement | null {
		const group = item.closest('[role="group"]');
		if (!group) return null;
		const parent = group.previousElementSibling as HTMLElement | null;
		return parent?.getAttribute('role') === 'treeitem' ? parent : null;
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
	}

	@onEvent({ selector: '[role="treeitem"]', type: 'click' })
	onClick(event: Event): void {
		const item = (event.target as HTMLElement).closest('[role="treeitem"]') as HTMLElement | null;
		if (!item || !this.contains(item)) return;
		this.select(item);
	}

	@onEvent({ selector: '[role="treeitem"]', type: 'keydown' })
	onKeydown(event: KeyboardEvent): void {
		const items = this.getVisibleItems();
		const current = (event.target as HTMLElement).closest('[role="treeitem"]') as HTMLElement | null;
		if (!current) return;
		const index = items.indexOf(current);

		switch (event.key) {
			case 'ArrowDown':
			case 'ArrowUp':
			case 'Home':
			case 'End': {
				const result = navigateRovingTabindex({
					items,
					current,
					key: event.key,
					orientation: 'vertical',
					wrap: false,
				});
				if (!result.handled) return;
				event.preventDefault();
				break;
			}
			case 'ArrowRight':
				event.preventDefault();
				if (current.getAttribute('aria-expanded') === 'false') {
					this.setExpanded(current, true);
				} else if (items[index + 1]) {
					focusRovingItem(items, index + 1);
				}
				break;
			case 'ArrowLeft':
				event.preventDefault();
				if (current.getAttribute('aria-expanded') === 'true') {
					this.setExpanded(current, false);
				} else {
					const parent = this.getParentItem(current);
					if (parent) {
						const nextItems = this.getVisibleItems();
						const parentIndex = nextItems.indexOf(parent);
						if (parentIndex >= 0) focusRovingItem(nextItems, parentIndex);
					}
				}
				break;
			case 'Enter':
			case ' ':
				event.preventDefault();
				if (current.hasAttribute('aria-expanded') && event.key === 'Enter') {
					const expanded = current.getAttribute('aria-expanded') === 'true';
					this.setExpanded(current, !expanded);
				} else {
					this.select(current);
				}
				break;
			default:
				break;
		}
	}

	override render() {
		return (
			<ul class="rui-tree" role="tree" aria-label={this.label || undefined} aria-multiselectable="false">
				<slot></slot>
			</ul>
		);
	}
}
