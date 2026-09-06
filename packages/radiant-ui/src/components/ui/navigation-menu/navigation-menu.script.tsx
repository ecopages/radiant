import { RadiantElement, customElement, onEvent, prop } from '@ecopages/radiant';
import { queryRovingTabindexItems } from '@/lib/focusable-elements';
import { applyRovingTabindex, navigateRovingTabindex } from '@/lib/roving-tabindex';
import { uniqueId } from '@/lib/unique-id';
import { PopoverController, shouldDismissPopoverPointer } from '../shared/popover-controller';

export type RuiNavigationMenuProps = {
	label?: string;
	/** Open trigger panels on pointer hover. Default: `false` (click / keyboard only). */
	openOnHover?: boolean;
	/** Delay in ms before hover opens a closed panel. Default: `200`. Ignored unless `openOnHover`. */
	hoverDelay?: number;
	/** Delay in ms before hover closes after the pointer leaves. Default: `150`. Ignored unless `openOnHover`. */
	closeDelay?: number;
};

/** Default delay before a hover-opened panel appears. */
export const NAVIGATION_MENU_DEFAULT_HOVER_DELAY = 200;

/** Default delay before a hover-opened panel hides after pointer leave. */
export const NAVIGATION_MENU_DEFAULT_CLOSE_DELAY = 150;

const NAVIGATION_MENU_GAP = 8;

/**
 * `<rui-navigation-menu>` — a site navigation shell with exclusive dropdown panels.
 *
 * The custom element is a behavior host: it does not render the composed tree.
 * Import the script and place light-DOM children that match the contract below,
 * or use the `RuiNavigationMenu*` view helpers which stamp the same targets.
 *
 * Implements the APG Disclosure Navigation Menu interaction model. Open panels
 * are positioned as popovers relative to their trigger (same overlay model as
 * `rui-popover` / shadcn Navigation Menu). Click and keyboard always open a
 * panel; set `open-on-hover` to also open after `hover-delay` ms of hover.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-ref="root"]` — `nav` landmark. Host listens for `keydown` here.
 * - `[data-navigation-item]` — top-level bar link or trigger. Host applies roving
 *   `tabIndex` across all items in the bar.
 * - `[data-navigation-trigger]` — button trigger with a flyout panel. Host sets
 *   `aria-expanded`, `aria-haspopup` (when a matching panel exists), `aria-controls`,
 *   and `id`.
 * - `[data-navigation-panel]` — panel region paired with a trigger by `data-value`.
 *   Host toggles `hidden`, `data-state`, `aria-hidden`, `role="region"`,
 *   `aria-labelledby`, and `id`, and positions the open panel as a popover.
 *
 * Per trigger / panel pair:
 * - `data-value` — identity linking a trigger to its panel.
 *
 * Optional:
 * - Bar links without panels use `[data-navigation-item]` without
 *   `[data-navigation-trigger]`.
 *
 * Do not set `aria-expanded`, `aria-controls`, `aria-hidden`, `hidden`, or
 * `data-state` on triggers or panels — the host owns those.
 *
 * Nested hosts: none.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/
 * @element rui-navigation-menu
 * @attr {string} label - Accessible name for the `nav` landmark.
 * @attr {boolean} open-on-hover - Open panels on pointer hover. Default: `false`.
 * @attr {number} hover-delay - Show delay in ms when `open-on-hover`. Default: `200`.
 * @attr {number} close-delay - Hide delay in ms after pointer leave when `open-on-hover`. Default: `150`.
 *
 * @cssprop --rui-navigation-menu-bar-surface - Bar fill. Default: `transparent`. Override on `rui-navigation-menu`.
 * @cssprop --rui-navigation-menu-bar-border-color - Bar border. Default: `transparent`. Override on `rui-navigation-menu`.
 * @cssprop --rui-navigation-menu-bar-shadow - Bar shadow. Default: `none`. Override on `rui-navigation-menu`.
 * @cssprop --rui-navigation-menu-bar-radius - Bar corner radius. Default: `--radius-container`. Override on `rui-navigation-menu`.
 * @cssprop --rui-navigation-menu-bar-padding-x - Bar inline padding. Default: `0px`. Override on `rui-navigation-menu`.
 * @cssprop --rui-navigation-menu-bar-padding-y - Bar block padding. Default: `0px`. Override on `rui-navigation-menu`.
 * @cssprop --rui-navigation-menu-panel-min-width - Panel minimum inline size. Default: `12rem`. Override on `rui-navigation-menu`.
 * @cssprop --rui-navigation-menu-panel-padding - Panel padding. Default: `--space-inset`. Override on `rui-navigation-menu`.
 * @cssprop --rui-popover-radius - Panel corner radius. Default: `--radius-container`.
 * @cssprop --rui-popover-surface - Panel fill. Default: `--background`.
 * @cssprop --rui-popover-border-color - Panel border. Default: `--border`.
 * @cssprop --rui-popover-shadow - Panel shadow. Default: `--shadow-overlay`.
 *
 * @remarks
 * Minimum tree:
 *
 * ```html
 * <nav data-ref="root">
 *   <button data-navigation-item data-navigation-trigger data-value="products">Products</button>
 *   <div data-navigation-panel data-value="products"></div>
 * </nav>
 * ```
 */
@customElement('rui-navigation-menu')
export class RuiNavigationMenu extends RadiantElement {
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: Boolean, reflect: true, attribute: 'open-on-hover', defaultValue: false }) openOnHover: boolean;
	@prop({ type: Number, attribute: 'hover-delay', defaultValue: NAVIGATION_MENU_DEFAULT_HOVER_DELAY })
	hoverDelay: number;
	@prop({ type: Number, attribute: 'close-delay', defaultValue: NAVIGATION_MENU_DEFAULT_CLOSE_DELAY })
	closeDelay: number;

	private openValue: string | null = null;
	private popoverController: PopoverController | null = null;
	private openTimer: ReturnType<typeof setTimeout> | null = null;
	private closeTimer: ReturnType<typeof setTimeout> | null = null;

	protected override onConnected(): void {
		this.syncPanels();
		this.syncBarRovingTabindex();
		this.syncPopover();
	}

	override disconnectedCallback(): void {
		this.clearHoverTimers();
		this.popoverController?.destroy();
		this.popoverController = null;
		super.disconnectedCallback();
	}

	private clearHoverTimers(): void {
		if (this.openTimer) clearTimeout(this.openTimer);
		if (this.closeTimer) clearTimeout(this.closeTimer);
		this.openTimer = null;
		this.closeTimer = null;
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

	private getOpenTrigger(): HTMLElement | null {
		return this.openValue ? this.getTrigger(this.openValue) : null;
	}

	private getOpenPanel(): HTMLElement | null {
		return this.openValue ? this.getPanel(this.openValue) : null;
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

	private ensurePairIds(trigger: HTMLElement, panel: HTMLElement): void {
		if (!trigger.id) {
			trigger.id = uniqueId('rui-navigation-trigger');
		}
		if (!panel.id) {
			panel.id = uniqueId('rui-navigation-panel');
		}
	}

	private syncPanels(): void {
		for (const panel of this.getPanels()) {
			const value = panel.getAttribute('data-value') ?? '';
			const open = this.openValue === value;
			panel.toggleAttribute('hidden', !open);
			panel.dataset.state = open ? 'open' : 'closed';
			panel.setAttribute('aria-hidden', String(!open));
			panel.setAttribute('role', 'region');

			const trigger = this.getTrigger(value);
			if (trigger) {
				this.ensurePairIds(trigger, panel);
				trigger.setAttribute('aria-expanded', String(open));
				trigger.setAttribute('aria-controls', panel.id);
				panel.setAttribute('aria-labelledby', trigger.id);
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

	private ensurePopoverController(): PopoverController {
		if (!this.popoverController) {
			this.popoverController = new PopoverController({
				getAnchor: () => this.getOpenTrigger(),
				getFloating: () => this.getOpenPanel(),
				getOpen: () => Boolean(this.openValue),
				getPlacement: () => 'bottom-start',
				gap: NAVIGATION_MENU_GAP,
				portal: false,
			});
		}
		return this.popoverController;
	}

	private syncPopover(): void {
		const controller = this.ensurePopoverController();
		controller.updateConfig({
			getAnchor: () => this.getOpenTrigger(),
			getFloating: () => this.getOpenPanel(),
			getOpen: () => Boolean(this.openValue),
		});
		controller.sync();
	}

	private closeMenu(returnFocus = false): void {
		const previous = this.openValue;
		if (!previous) {
			return;
		}

		this.clearHoverTimers();
		this.openValue = null;
		this.syncPanels();
		this.syncPopover();

		if (returnFocus) {
			this.getTrigger(previous)?.focus();
		}
	}

	private openPanel(value: string, options: { focusPanel?: boolean; toggle?: boolean } = {}): void {
		const { focusPanel = true, toggle = true } = options;
		if (this.openValue === value) {
			if (toggle) {
				this.closeMenu(true);
			}
			return;
		}

		this.clearHoverTimers();
		const previousPanel = this.getOpenPanel();
		const previousHadFocus = Boolean(
			previousPanel && document.activeElement instanceof Node && previousPanel.contains(document.activeElement),
		);

		this.openValue = value;
		this.syncPanels();
		this.syncPopover();
		queueMicrotask(() => {
			if (focusPanel) {
				this.focusPanelEntry(value);
				return;
			}
			if (previousHadFocus) {
				this.getTrigger(value)?.focus();
			}
		});
	}

	private isTouchPointer(event: PointerEvent): boolean {
		return event.pointerType === 'touch';
	}

	private pointerIsInOpenMenu(node: EventTarget | null): boolean {
		if (!(node instanceof Node)) {
			return false;
		}
		return !shouldDismissPopoverPointer(this.getOpenTrigger(), this.getOpenPanel(), node);
	}

	private triggerValueFromEvent(event: Event): string | null {
		const target = event.target;
		if (!(target instanceof Element)) {
			return null;
		}
		const trigger = target.closest<HTMLElement>('[data-navigation-trigger]');
		return trigger?.getAttribute('data-value') ?? null;
	}

	private scheduleHoverOpen(value: string): void {
		if (!this.openOnHover || !this.getPanel(value)) {
			return;
		}

		this.clearHoverTimers();
		if (this.openValue === value) {
			return;
		}

		const delay = this.openValue ? 0 : Math.max(0, this.hoverDelay);
		if (delay <= 0) {
			this.openPanel(value, { focusPanel: false, toggle: false });
			return;
		}

		this.openTimer = setTimeout(() => {
			this.openTimer = null;
			this.openPanel(value, { focusPanel: false, toggle: false });
		}, delay);
	}

	private scheduleHoverClose(): void {
		if (!this.openOnHover || !this.openValue) {
			this.clearHoverTimers();
			return;
		}

		this.clearHoverTimers();
		const delay = Math.max(0, this.closeDelay);
		if (delay <= 0) {
			this.closeMenu();
			return;
		}

		this.closeTimer = setTimeout(() => {
			this.closeTimer = null;
			this.closeMenu();
		}, delay);
	}

	@onEvent({ document: true, type: 'pointerdown' })
	onDocumentPointerDown(event: PointerEvent): void {
		if (!this.openValue) {
			return;
		}

		if (this.pointerIsInOpenMenu(event.target)) {
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
		const panel = this.getOpenPanel();
		if (active && !this.contains(active) && !(panel && panel.contains(active))) {
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

	@onEvent({ selector: '[data-navigation-trigger]', type: 'pointerover' })
	onTriggerPointerOver(event: PointerEvent): void {
		if (!this.openOnHover || this.isTouchPointer(event)) {
			return;
		}

		const value = this.triggerValueFromEvent(event);
		if (!value) {
			return;
		}

		this.scheduleHoverOpen(value);
	}

	@onEvent({ selector: '[data-navigation-trigger]', type: 'pointerout' })
	onTriggerPointerOut(event: PointerEvent): void {
		if (!this.openOnHover || this.isTouchPointer(event)) {
			return;
		}

		if (this.pointerIsInOpenMenu(event.relatedTarget)) {
			return;
		}

		const related = event.relatedTarget;
		if (related instanceof Element && related.closest('[data-navigation-trigger]') && this.contains(related)) {
			return;
		}

		this.scheduleHoverClose();
	}

	@onEvent({ selector: '[data-navigation-panel]', type: 'pointerover' })
	onPanelPointerOver(event: PointerEvent): void {
		if (!this.openOnHover || this.isTouchPointer(event) || !this.openValue) {
			return;
		}

		const panel = (event.target as HTMLElement).closest<HTMLElement>('[data-navigation-panel]');
		if (!panel || panel.getAttribute('data-value') !== this.openValue) {
			return;
		}

		this.clearHoverTimers();
	}

	@onEvent({ selector: '[data-navigation-panel]', type: 'pointerout' })
	onPanelPointerOut(event: PointerEvent): void {
		if (!this.openOnHover || this.isTouchPointer(event)) {
			return;
		}

		if (this.pointerIsInOpenMenu(event.relatedTarget)) {
			return;
		}

		this.scheduleHoverClose();
	}

	@onEvent({ selector: '[data-navigation-item]', type: 'pointerover' })
	onBarItemPointerOver(event: PointerEvent): void {
		if (!this.openOnHover || this.isTouchPointer(event) || !this.openValue) {
			return;
		}

		const item = (event.target as HTMLElement).closest<HTMLElement>('[data-navigation-item]');
		if (!item || this.isBarTrigger(item)) {
			return;
		}

		this.scheduleHoverClose();
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
