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
 * `<rui-tabs>` — layered sections with one visible panel at a time.
 *
 * The custom element is a behavior host: it does not render tab chrome. Import
 * the script and place light-DOM children that match the contract below, or use
 * `RuiTabList`, `RuiTab`, `RuiTabPanels`, and `RuiTabPanel`, which stamp the
 * same targets.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[role="tablist"]` — tab strip. Host sets `aria-label` from `label` when the
 *   tablist has no `aria-label`.
 * - `[role="tab"]` — tab control. Host sets `aria-selected` and `tabIndex`.
 * - `[role="tabpanel"]` — panel region. Host sets `hidden`; sets `tabIndex` when
 *   not already present.
 *
 * Per tab / panel:
 * - `data-tab-value` — identity matched against `value`. Falls back to `id` with
 *   `tab-` / `panel-` prefixes stripped.
 *
 * Author `aria-label` on the tablist (preferred over `label` on the host) and
 * `aria-disabled="true"` on a tab to block activation. Do not set `aria-selected`,
 * `tabIndex`, or `hidden` on panels — the host owns those after `resync()`.
 *
 * Nested hosts: none.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 * @element rui-tabs
 * @attr {('ghost'|'boxed')} variant - Visual treatment. Default: `boxed`.
 * @attr {string} value - Selected tab id. Default: `''` (first tab).
 * @attr {string} label - Accessible name for the tab list when `[role="tablist"]` has no `aria-label`.
 * @attr {boolean} automatic - When `true`, focusing a tab activates it. Default: `true`.
 * @fires rui-change - Emitted when the selected tab changes; `detail.value` is the tab id.
 *
 * @cssprop --rui-tabs-radius - Boxed card corner radius. Default: `--radius-container`.
 * @cssprop --rui-tabs-indicator-width - Selected-tab underline thickness. Default: `2px`.
 * @cssprop --rui-tabs-indicator-color - Selected-tab underline. Default: `--primary`.
 * @cssprop --rui-tabs-tab-padding-x - Tab inline padding. Default: `--space-control-x`.
 * @cssprop --rui-tabs-tab-padding-y - Tab block padding. Default: `--space-control-y`.
 * @cssprop --rui-tabs-panel-padding - Panel padding. Default: `--space-inset`.
 *
 * @remarks
 * `resync()` re-applies tablist labeling and selected/hidden state from `value`.
 * Observes `childList` so replaced children (e.g. parent re-render) stay in sync.
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
