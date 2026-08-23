import { RadiantElement, customElement, event, onEvent, onUpdated, prop } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { navigateRovingTabindex } from '@/lib/roving-tabindex';

export type RuiTabsVariant = 'ghost' | 'boxed';

export type RuiTabsProps = {
	/** Visual treatment. `boxed` wraps tabs in a bordered card; `ghost` is underline-only. Default: `boxed`. */
	variant?: RuiTabsVariant;
	/** Selected tab id (matches `RuiTab` / `RuiTabPanel` `id`). Defaults to the first tab. */
	value?: string;
	/**
	 * Accessible name for the tab list when `RuiTabList` has no `aria-label`.
	 * Prefer `aria-label` on `RuiTabList`.
	 */
	label?: string;
	/**
	 * When `true` (default), focusing a tab activates it (automatic activation).
	 * When `false`, Space/Enter activate the focused tab (manual activation).
	 */
	automatic?: boolean;
};

export type RuiTabsChangeDetail = {
	value: string;
};

/**
 * `<rui-tabs>` — layered sections of content with one visible panel at a time.
 *
 * Compose with `RuiTabList`, `RuiTab`, `RuiTabPanels`, and `RuiTabPanel`, or author
 * matching `[role="tablist"]`, `[role="tab"]`, and `[role="tabpanel"]` markup directly.
 *
 * @remarks
 * Re-syncs when light-DOM children are replaced (e.g. a parent host re-renders the
 * tab list). Observes `childList` only so attribute updates from sync itself do not loop.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 *
 * @element rui-tabs
 * @slot - `RuiTabList` and `RuiTabPanels` (or matching tablist / tabpanel markup).
 * @fires rui-change - Emitted when the selected tab changes.
 */
@customElement('rui-tabs')
export class RuiTabs extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: 'boxed' }) variant: RuiTabsVariant;
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: Boolean, defaultValue: true }) automatic: boolean;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiTabsChangeDetail>;

	private childObserver: MutationObserver | null = null;

	override connectedCallback(): void {
		super.connectedCallback();
		this.childObserver = new MutationObserver(() => this.resync());
		this.childObserver.observe(this, { childList: true, subtree: true });
	}

	protected override onConnected(): void {
		this.resync();
	}

	override disconnectedCallback(): void {
		this.childObserver?.disconnect();
		this.childObserver = null;
		super.disconnectedCallback();
	}

	@onUpdated(['value', 'label'])
	onPropsUpdated(): void {
		this.resync();
	}

	/** Re-applies tablist labeling and selected/hidden state from the current `value`. */
	resync(): void {
		this.syncTablistLabel();
		this.syncSelection(this.value || this.getTabValue(this.getTabs()[0]) || '');
	}

	private getTabs(): HTMLElement[] {
		return Array.from(this.querySelectorAll<HTMLElement>('[role="tab"]'));
	}

	private getPanels(): HTMLElement[] {
		return Array.from(this.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
	}

	private getTabValue(tab: HTMLElement | undefined): string {
		if (!tab) return '';
		return tab.dataset.tabValue ?? tab.id.replace(/^tab-/, '');
	}

	private syncTablistLabel(): void {
		const tablist = this.querySelector<HTMLElement>('[role="tablist"]');
		if (!tablist || tablist.hasAttribute('aria-label') || !this.label) return;
		tablist.setAttribute('aria-label', this.label);
	}

	private syncSelection(nextValue: string): void {
		const tabs = this.getTabs();
		const panels = this.getPanels();
		if (!tabs.length) return;

		const selected =
			tabs.find((tab) => this.getTabValue(tab) === nextValue) ??
			tabs.find((tab) => tab.id === nextValue) ??
			tabs[0];
		const selectedValue = this.getTabValue(selected);
		this.value = selectedValue;

		for (const tab of tabs) {
			const isSelected = tab === selected;
			tab.setAttribute('aria-selected', String(isSelected));
			tab.tabIndex = isSelected ? 0 : -1;
		}

		for (const panel of panels) {
			const panelValue = panel.dataset.tabValue ?? panel.id.replace(/^panel-/, '');
			const isSelected = panelValue === selectedValue;
			panel.hidden = !isSelected;
			if (!panel.hasAttribute('tabindex')) {
				panel.tabIndex = 0;
			}
		}
	}

	private activateTab(tab: HTMLElement): void {
		if (!tab || tab.getAttribute('aria-disabled') === 'true') return;
		this.syncSelection(this.getTabValue(tab));
		this.changeEvent.emit({ value: this.value });
	}

	@onEvent({ selector: '[role="tab"]', type: 'click' })
	onTabClick(event: Event): void {
		const tab = (event.target as HTMLElement).closest('[role="tab"]') as HTMLElement | null;
		if (!tab || !this.contains(tab)) return;
		this.activateTab(tab);
	}

	@onEvent({ selector: '[role="tab"]', type: 'keydown' })
	onTabKeydown(event: KeyboardEvent): void {
		const tabs = this.getTabs();
		const current = (event.target as HTMLElement).closest('[role="tab"]') as HTMLElement | null;
		if (!current || !tabs.includes(current)) return;

		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			this.activateTab(current);
			return;
		}

		const result = navigateRovingTabindex({
			items: tabs,
			current,
			key: event.key,
			orientation: 'horizontal',
		});
		if (!result.handled) return;

		event.preventDefault();
		if (this.automatic) this.activateTab(result.item);
	}
}
