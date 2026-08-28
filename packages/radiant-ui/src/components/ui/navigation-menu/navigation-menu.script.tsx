import { RadiantElement, customElement, onEvent, prop } from '@ecopages/radiant';
import { queryRovingTabindexItems } from '@/lib/focusable-elements';
import { applyRovingTabindex, navigateRovingTabindex } from '@/lib/roving-tabindex';

export type RuiNavigationMenuProps = {
	label?: string;
};

/**
 * `<rui-navigation-menu>` — a site navigation shell with exclusive dropdown panels.
 *
 * The custom element is a behavior host: it does not render the composed tree.
 * Import the script and place light-DOM children that match the contract below,
 * or use the `RuiNavigationMenu*` view helpers which stamp the same targets.
 *
 * Implements the APG Disclosure Navigation Menu interaction model.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-navigation-item]` — top-level bar link or trigger. Host applies roving
 *   `tabIndex` across all items in the bar.
 * - `[data-navigation-trigger]` — button trigger with a flyout panel. Host sets
 *   `aria-expanded`, `aria-haspopup` (when a matching panel exists), and `id`.
 * - `[data-navigation-panel]` — panel region paired with a trigger by `data-value`.
 *   Host toggles `hidden`, `data-state`, `aria-hidden`, `role="region"`, and
 *   `aria-labelledby`.
 *
 * Per trigger / panel pair:
 * - `data-value` — identity linking a trigger to its panel.
 *
 * Optional:
 * - Bar links without panels use `[data-navigation-item]` without
 *   `[data-navigation-trigger]`.
 *
 * Do not set `aria-expanded`, `aria-hidden`, `hidden`, or `data-state` on triggers
 * or panels — the host owns those.
 *
 * Nested hosts: none.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/
 * @element rui-navigation-menu
 * @attr {string} label - Accessible name for the `nav` landmark.
 */
@customElement('rui-navigation-menu')
export class RuiNavigationMenu extends RadiantElement {
	@prop({ type: String, defaultValue: '' }) label: string;

	private openValue: string | null = null;

	protected override onConnected(): void {
		this.syncPanels();
		this.syncBarRovingTabindex();
	}

	private getBarItems(): HTMLElement[] {
		return Array.from(this.querySelectorAll<HTMLElement>('[data-navigation-item]'));
	}

	private syncBarRovingTabindex(): void {
		const items = this.getBarItems();
		const activeIndex = Math.max(
			0,
			items.findIndex((item) => item.tabIndex === 0 || item === document.activeElement),
		);
		applyRovingTabindex(items, activeIndex);
	}

	private isBarTrigger(item: HTMLElement): boolean {
		return item.hasAttribute('data-navigation-trigger');
	}

	private getTriggers(): HTMLElement[] {
		return Array.from(this.querySelectorAll<HTMLElement>('[data-navigation-trigger]'));
	}

	private getPanel(value: string): HTMLElement | null {
		return this.querySelector<HTMLElement>(`[data-navigation-panel][data-value="${value}"]`);
	}

	private getTrigger(value: string): HTMLElement | null {
		return this.querySelector<HTMLElement>(`[data-navigation-trigger][data-value="${value}"]`);
	}

	private getPanels(): HTMLElement[] {
		return Array.from(this.querySelectorAll<HTMLElement>('[data-navigation-panel]'));
	}

	private getPanelFocusables(panel: HTMLElement): HTMLElement[] {
		return queryRovingTabindexItems(panel);
	}

	private focusPanelEntry(value: string): void {
		const panel = this.getPanel(value);
		if (!panel) {
			this.getTrigger(value)?.focus();
			return;
		}

		const focusables = this.getPanelFocusables(panel);
		if (focusables.length > 0) {
			focusables[0].focus();
			return;
		}

		if (!panel.hasAttribute('tabindex')) {
			panel.tabIndex = -1;
		}

		panel.focus();
	}

	private syncPanels(): void {
		for (const panel of this.getPanels()) {
			const value = panel.getAttribute('data-value') ?? '';
			const open = this.openValue === value;
			panel.toggleAttribute('hidden', !open);
			panel.dataset.state = open ? 'open' : 'closed';
			panel.setAttribute('aria-hidden', String(!open));

			const trigger = this.getTrigger(value);
			if (trigger) {
				trigger.setAttribute('aria-expanded', String(open));
				panel.setAttribute('role', 'region');
				panel.setAttribute('aria-labelledby', trigger.id || `${value}-trigger`);
				if (!trigger.id) {
					trigger.id = `${value}-trigger`;
				}
			}
		}

		for (const trigger of this.getTriggers()) {
			const value = trigger.getAttribute('data-value') ?? '';
			const open = this.openValue === value;
			trigger.setAttribute('aria-expanded', String(open));
			if (this.getPanel(value)) {
				trigger.setAttribute('aria-haspopup', 'true');
			} else {
				trigger.removeAttribute('aria-haspopup');
			}
		}
	}

	private closeMenu(returnFocus = false): void {
		const previous = this.openValue;
		if (!previous) {
			return;
		}

		this.openValue = null;
		this.syncPanels();

		if (returnFocus) {
			this.getTrigger(previous)?.focus();
		}
	}

	private openPanel(value: string, focusPanel = true): void {
		if (this.openValue === value) {
			this.closeMenu(true);
			return;
		}

		this.openValue = value;
		this.syncPanels();
		queueMicrotask(() => {
			if (focusPanel) {
				this.focusPanelEntry(value);
			} else {
				this.getTrigger(value)?.focus();
			}
		});
	}

	private getEventElement(event: Event): Element | null {
		const target = event.target;
		if (target instanceof Element) {
			return target;
		}

		if (target instanceof Text) {
			return target.parentElement;
		}

		return null;
	}

	private isWithinOpenPanel(event: MouseEvent): boolean {
		if (!this.openValue) {
			return false;
		}

		const openPanel = this.getPanel(this.openValue);
		if (!openPanel) {
			return false;
		}

		return event.composedPath().some((node) => node instanceof Node && openPanel.contains(node));
	}

	@onEvent({ document: true, type: 'click' })
	onDocumentClick(event: MouseEvent): void {
		if (!this.openValue) {
			return;
		}

		if (this.isWithinOpenPanel(event)) {
			return;
		}

		const element = this.getEventElement(event);
		if (element && this.contains(element)) {
			return;
		}

		this.closeMenu();
	}

	@onEvent({ document: true, type: 'keydown' })
	onDocumentKeydown(event: KeyboardEvent): void {
		if (event.key !== 'Escape' || !this.openValue) {
			return;
		}

		const active = document.activeElement;
		if (active && !this.contains(active)) {
			return;
		}

		event.preventDefault();
		this.closeMenu(true);
	}

	@onEvent({ ref: 'root', type: 'keydown' })
	onRootKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && this.openValue) {
			event.preventDefault();
			this.closeMenu(true);
		}
	}

	@onEvent({ selector: '[data-navigation-trigger]', type: 'click' })
	onTriggerClick(event: Event): void {
		const trigger = (event.target as HTMLElement).closest<HTMLElement>('[data-navigation-trigger]');
		const value = trigger?.getAttribute('data-value');
		if (!trigger || !value) {
			return;
		}

		event.preventDefault();
		this.openPanel(value);
	}

	@onEvent({ selector: '[data-navigation-item]', type: 'keydown' })
	onBarItemKeydown(event: KeyboardEvent): void {
		const item = (event.target as HTMLElement).closest<HTMLElement>('[data-navigation-item]');
		if (!item || this.handleBarTriggerKeydown(event, item)) return;

		const result = navigateRovingTabindex({
			items: this.getBarItems(),
			current: item,
			key: event.key,
			orientation: 'horizontal',
			wrap: false,
		});

		if (!result.handled) return;
		event.preventDefault();
		this.syncMenuToBarItem(result.item);
	}

	private handleBarTriggerKeydown(event: KeyboardEvent, item: HTMLElement): boolean {
		if (event.key === 'Escape') {
			if (this.openValue) {
				event.preventDefault();
				this.closeMenu(true);
			}
			return true;
		}

		const value = item.getAttribute('data-value');
		if (!this.isBarTrigger(item) || !value) return false;
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			this.openPanel(value);
			return true;
		}
		if (event.key !== 'ArrowDown') return false;
		event.preventDefault();
		if (this.openValue === value) this.focusPanelEntry(value);
		else this.openPanel(value);
		return true;
	}

	private syncMenuToBarItem(item: HTMLElement): void {
		if (!this.openValue) return;
		const value = item.getAttribute('data-value');
		if (this.isBarTrigger(item) && value) this.openPanel(value);
		else this.closeMenu(false);
	}

	@onEvent({ selector: '[data-navigation-panel]', type: 'keydown' })
	onPanelKeydown(event: KeyboardEvent): void {
		const target = event.target;
		if (!(target instanceof Element)) {
			return;
		}

		const panel = target.closest<HTMLElement>('[data-navigation-panel]');
		if (!panel || panel.hidden) {
			return;
		}

		const value = panel.getAttribute('data-value');
		if (!value || this.openValue !== value) {
			return;
		}

		const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		if (!active || !panel.contains(active)) {
			return;
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			this.closeMenu(true);
			return;
		}

		const focusables = this.getPanelFocusables(panel);

		if (event.key === 'ArrowUp' && active === focusables[0]) {
			event.preventDefault();
			this.getTrigger(value)?.focus();
			return;
		}
		if (!focusables.length) {
			return;
		}

		const result = navigateRovingTabindex({
			items: focusables,
			current: active,
			key: event.key,
			orientation: 'vertical',
			wrap: false,
		});

		if (!result.handled) {
			return;
		}

		event.preventDefault();
	}
}
