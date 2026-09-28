import { RadiantElement, bindTo, customElement, event, onEvent, onUpdated, prop } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { cycleValue } from '@/lib/cycle-value';
import type { RuiButtonSize, RuiButtonVariant } from '../button/button';

export type RuiCycleToggleProps = {
	/** Active item id (matches `RuiCycleToggleItem` `id`). Defaults to the first enabled item. */
	value?: string;
	/** Visual style passed to the inner button. Default: `filled`. */
	variant?: RuiButtonVariant;
	/** Control size passed to the inner button. Default: `md`. */
	size?: RuiButtonSize;
	/** Accessible name for the cycle button. */
	label?: string;
	/** Disable the cycle button. Default: `false`. */
	disabled?: boolean;
};

export type RuiCycleToggleChangeDetail = {
	value: string;
};

const ITEM_SELECTOR = '[data-cycle-value]';
const BUTTON_SELECTOR = 'button[data-cycle-toggle-button]';

/**
 * `<rui-cycle-toggle>` — cycles through exclusive values on each button press.
 *
 * The custom element is a behavior host: it does not render the composed tree.
 * Import the script and place light-DOM children that match the contract below,
 * or use the `RuiCycleToggle` view helpers which stamp the same targets.
 *
 * Only the active item is visible; click advances to the next enabled item and wraps.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `button[data-cycle-toggle-button]` — cycle control. Host sets `aria-label`, `disabled`, `rui-button--*` classes.
 * - `[data-cycle-value]` — one per option inside the button. Host sets `hidden` on inactive items.
 *
 * Per item:
 * - `data-cycle-value` — item identity (matches host `value`).
 * - `aria-disabled="true"` — skip item when cycling.
 *
 * Do not set `hidden` on items — the host owns visibility.
 *
 * Nested hosts: none.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/button/
 *
 * @element rui-cycle-toggle
 *
 * @attr {string} value - Active item id. Reflects to markup. Default: `''`.
 * @attr {('filled'|'outline'|'destructive'|'ghost'|'link')} variant - Button variant
 *   passed to the inner button. Default: `filled`.
 * @attr {('none'|'sm'|'md'|'lg')} size - Button size passed to the inner button. Default: `md`.
 * @attr {string} label - Accessible name prefix for the cycle button. Default: `''`.
 * @attr {boolean} disabled - Disables the cycle button. Default: `false`.
 *
 * @fires rui-change - Emitted after `value` advances; `detail.value` is the new id.
 *
 * @remarks
 * Minimum headless tree:
 *
 * ```html
 * <rui-cycle-toggle value="light" label="Theme">
 *   <button type="button" data-cycle-toggle-button>
 *     <span data-cycle-value="system">System</span>
 *     <span data-cycle-value="light">Light</span>
 *     <span data-cycle-value="dark">Dark</span>
 *   </button>
 * </rui-cycle-toggle>
 * ```
 *
 * The host writes `rui-button--*` variant and size classes onto the cycle button.
 * Query targets are `button[data-cycle-toggle-button]` and `[data-cycle-value]`.
 */
@customElement('rui-cycle-toggle')
export class RuiCycleToggle extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;
	@prop({ type: String, reflect: true, defaultValue: 'filled' }) variant: RuiButtonVariant;
	@prop({ type: String, reflect: true, defaultValue: 'md' }) size: RuiButtonSize;
	@prop({ type: String, defaultValue: '' }) label: string;

	@prop({ type: Boolean, reflect: true, defaultValue: false })
	@bindTo({ selector: 'button[data-cycle-toggle-button]', prop: 'disabled' })
	disabled: boolean;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiCycleToggleChangeDetail>;

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

	@onUpdated(['value', 'label', 'disabled', 'size', 'variant'])
	onPropsUpdated(): void {
		this.resync();
	}

	/** Re-applies button labeling and the visible cycle item from the current `value`. */
	resync(): void {
		const selected = this.syncSelection(this.value || this.getItemValue(this.getEnabledItems()[0]) || '');
		this.syncButtonPresentation();
		this.syncButtonLabel(selected);
	}

	private getItems(): HTMLElement[] {
		return Array.from(this.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
	}

	private getEnabledItems(): HTMLElement[] {
		return this.getItems().filter((item) => item.getAttribute('aria-disabled') !== 'true');
	}

	private getItemValue(item: HTMLElement | undefined): string {
		if (!item) return '';
		return item.dataset.cycleValue ?? '';
	}

	private syncButtonLabel(selected: HTMLElement | undefined): void {
		const button = this.querySelector<HTMLButtonElement>(BUTTON_SELECTOR);
		if (!button) return;

		const selectedLabel =
			selected?.querySelector<HTMLElement>('[aria-label]')?.ariaLabel ?? selected?.textContent?.trim();
		if (!this.label || !selectedLabel) {
			button.removeAttribute('aria-label');
			return;
		}

		button.setAttribute('aria-label', `${this.label}: ${selectedLabel}`);
	}

	private syncButtonPresentation(): void {
		const button = this.querySelector<HTMLButtonElement>(BUTTON_SELECTOR);
		if (!button) return;

		for (const className of Array.from(button.classList)) {
			if (className.startsWith('rui-button--')) button.classList.remove(className);
		}
		button.classList.add(`rui-button--${this.variant}`, `rui-button--${this.size}`);
	}

	private syncSelection(nextValue: string): HTMLElement | undefined {
		const items = this.getItems();
		if (!items.length) return undefined;

		const enabled = this.getEnabledItems();
		const selected =
			items.find((item) => this.getItemValue(item) === nextValue && enabled.includes(item)) ??
			enabled[0] ??
			items[0];
		const selectedValue = this.getItemValue(selected);
		this.value = selectedValue;

		for (const item of items) {
			item.hidden = item !== selected;
		}

		return selected;
	}

	private cycle(): void {
		if (this.disabled) return;

		const enabled = this.getEnabledItems();
		const values = enabled.map((item) => this.getItemValue(item)).filter(Boolean);
		if (!values.length) return;

		const next = cycleValue(values, this.value || undefined);
		if (next === this.value) return;

		this.syncSelection(next);
		this.changeEvent.emit({ value: this.value });
	}

	@onEvent({ selector: BUTTON_SELECTOR, type: 'click' })
	onButtonClick(): void {
		this.cycle();
	}
}
