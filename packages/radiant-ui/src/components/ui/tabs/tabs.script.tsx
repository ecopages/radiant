import { RadiantElement, customElement, event, onEvent, onUpdated, prop } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { navigateRovingTabindex } from '../../../lib/roving-tabindex';

export type RuiTabsProps = {
	/** ID of the initially selected tab. Defaults to the first tab. */
	value?: string;
	/** Accessible name for the tab list. */
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
 * Implements the WAI-ARIA APG Tabs pattern with a `tablist`, `tab` controls, and
 * associated `tabpanel` regions. Automatic activation is the default.
 *
 * Author a `[role="tablist"]` of `[role="tab"]` buttons and matching
 * `[role="tabpanel"]` regions as children. Each tab must have an `id` and
 * `aria-controls` pointing at its panel; each panel must have `aria-labelledby`
 * pointing at its tab.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 *
 * Keyboard interaction:
 * - `Tab`: move focus into the active tab, then to the panel / next page control
 * - `ArrowLeft` / `ArrowRight`: move focus (and activate when automatic)
 * - `Home` / `End`: jump to first / last tab
 * - `Space` / `Enter`: activate the focused tab (manual mode)
 *
 * @element rui-tabs
 * @slot - A tablist and one or more tabpanels.
 * @fires rui-change - Emitted when the selected tab changes.
 */
@customElement('rui-tabs')
export class RuiTabs extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: Boolean, defaultValue: true }) automatic: boolean;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiTabsChangeDetail>;

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => {
			this.syncTablistLabel();
			this.syncSelection(this.value || this.getTabs()[0]?.id || '');
		});
	}

	@onUpdated(['value', 'label'])
	onPropsUpdated(): void {
		this.syncTablistLabel();
		if (this.value) this.syncSelection(this.value);
	}

	private getTabs(): HTMLElement[] {
		return Array.from(this.querySelectorAll<HTMLElement>('[role="tab"]'));
	}

	private getPanels(): HTMLElement[] {
		return Array.from(this.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
	}

	private syncTablistLabel(): void {
		const tablist = this.querySelector<HTMLElement>('[role="tablist"]');
		if (!tablist || !this.label) return;
		tablist.setAttribute('aria-label', this.label);
	}

	private syncSelection(nextValue: string): void {
		const tabs = this.getTabs();
		const panels = this.getPanels();
		if (!tabs.length) return;

		const selected = tabs.find((tab) => tab.id === nextValue) ?? tabs[0];
		this.value = selected.id;

		for (const tab of tabs) {
			const isSelected = tab === selected;
			tab.setAttribute('aria-selected', String(isSelected));
			tab.tabIndex = isSelected ? 0 : -1;
		}

		for (const panel of panels) {
			const controls = tabs.find((tab) => tab.getAttribute('aria-controls') === panel.id);
			const isSelected = controls === selected;
			panel.hidden = !isSelected;
			if (!panel.hasAttribute('tabindex')) {
				panel.tabIndex = 0;
			}
		}
	}

	private activateTab(tab: HTMLElement): void {
		if (!tab || tab.getAttribute('aria-disabled') === 'true') return;
		this.syncSelection(tab.id);
		this.changeEvent.emit({ value: tab.id });
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
