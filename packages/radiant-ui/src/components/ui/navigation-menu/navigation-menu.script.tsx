import { RadiantElement, customElement, onEvent, prop } from '@ecopages/radiant';
import { queryRovingTabindexItems } from '@/lib/focusable-elements';
import { applyRovingTabindex, navigateRovingTabindex } from '@/lib/roving-tabindex';

export type RuiNavigationMenuProps = {
	label?: string;
};

type RuiNavigationMenuBindings = {
	label: string;
};

/**
 * `<rui-navigation-menu>` — a composition-first site navigation shell.
 *
 * Implements the APG Disclosure Navigation Menu interaction model: top-level
 * triggers open exclusive panels composed from other radiant-ui primitives.
 *
 * Mark triggers with `data-navigation-trigger` and `data-value`. Mark matching
 * panels with `data-navigation-panel` and the same `data-value`. Top-level bar
 * links and triggers should use `data-navigation-item` (added by the view helpers).
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/
 * @element rui-navigation-menu
 * @attr {string} label - Accessible name for the `nav` landmark.
 * @cssclass rui-navigation-menu - Root `nav` surface.
 * @cssclass rui-navigation-menu__bar - Top-level trigger / link bar.
 * @cssclass rui-navigation-menu__panels - Panel region (`aria-hidden` toggling).
 */
@customElement('rui-navigation-menu')
export class RuiNavigationMenu extends RadiantElement<RuiNavigationMenuBindings> {
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
		if (!item) {
			return;
		}

		const barItems = this.getBarItems();
		const isTrigger = this.isBarTrigger(item);
		const value = item.getAttribute('data-value');

		if (event.key === 'Escape') {
			if (this.openValue) {
				event.preventDefault();
				this.closeMenu(true);
			}
			return;
		}

		if (isTrigger && value && (event.key === 'Enter' || event.key === ' ')) {
			event.preventDefault();
			this.openPanel(value);
			return;
		}

		if (isTrigger && value && event.key === 'ArrowDown') {
			event.preventDefault();
			if (this.openValue === value) {
				this.focusPanelEntry(value);
			} else {
				this.openPanel(value);
			}
			return;
		}

		const result = navigateRovingTabindex({
			items: barItems,
			current: item,
			key: event.key,
			orientation: 'horizontal',
			wrap: false,
		});

		if (!result.handled) {
			return;
		}

		event.preventDefault();

		const nextItem = result.item;
		const nextValue = nextItem.getAttribute('data-value');
		const nextIsTrigger = this.isBarTrigger(nextItem);

		if (this.openValue) {
			if (nextIsTrigger && nextValue) {
				this.openPanel(nextValue);
			} else {
				this.closeMenu(false);
			}
		}
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
