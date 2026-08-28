import { RadiantElement, customElement, event, onEvent, onUpdated, prop } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';

export type RuiRadioGroupProps = {
	/** Currently selected value. Reflects to markup. */
	value?: string;
	/** Form field name shared by all radios in the group. */
	name?: string;
	/** Accessible name for the group when no visible legend is slotted. */
	label?: string;
	/** Disable every radio in the group. Default: `false`. */
	disabled?: boolean;
};

export type RuiRadioGroupChangeDetail = {
	value: string;
};

/**
 * `<rui-radio-group>` — radio group behavior host.
 *
 * The custom element is a behavior host: it does not render the composed tree.
 * Import the script and place light-DOM children that match the contract below,
 * or use the `RuiRadioGroup` view helpers which stamp the same targets.
 *
 * Implements the WAI-ARIA APG Radio Group pattern using native
 * `<input type="radio">` controls. Arrow-key navigation and Space activation
 * are provided by the browser.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-radio-group-root]` — radiogroup container. Host sets `aria-label`, `aria-disabled`.
 * - `input[type="radio"]` — one per option. Host sets `name`, `checked`, `disabled`.
 *
 * Per radio:
 * - `value` — selection identity.
 * - `data-disabled` — per-item disabled flag preserved when the group is enabled.
 *
 * Do not set `name`, `checked`, or `disabled` on radios — the host owns those.
 *
 * Nested hosts: none.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/radio/
 *
 * @element rui-radio-group
 *
 * @attr {string} value - Selected radio value. Reflects to markup. Default: `''`.
 * @attr {string} name - Form field name shared by all radios in the group. Default: `''`.
 * @attr {string} label - Accessible name when no visible legend is composed. Default: `''`.
 * @attr {boolean} disabled - Disables every radio in the group. Default: `false`.
 *
 * @fires rui-change - Emitted after the selected value changes; `detail.value` holds the new value.
 *
 * @remarks
 * Minimum headless tree:
 *
 * ```html
 * <rui-radio-group value="pro" name="plan" label="Plan">
 *   <div data-radio-group-root role="radiogroup">
 *     <label><input type="radio" value="free" /> Free</label>
 *     <label><input type="radio" value="pro" /> Pro</label>
 *   </div>
 * </rui-radio-group>
 * ```
 *
 * BEM classes are presentation-only; see view `@cssclass`.
 */
@customElement('rui-radio-group')
export class RuiRadioGroup extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;
	@prop({ type: String, defaultValue: '' }) name: string;
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiRadioGroupChangeDetail>;

	protected override onConnected(): void {
		this.syncRadios();
	}

	@onUpdated(['value', 'name', 'label', 'disabled'])
	syncRadios(): void {
		const group = this.querySelector<HTMLElement>('[data-radio-group-root]');
		if (group) {
			if (this.label) {
				group.setAttribute('aria-label', this.label);
			} else {
				group.removeAttribute('aria-label');
			}
			if (this.disabled) {
				group.setAttribute('aria-disabled', 'true');
			} else {
				group.removeAttribute('aria-disabled');
			}
		}

		const radios = this.querySelectorAll<HTMLInputElement>('input[type="radio"]');
		const groupName = this.name || this.getAttribute('name') || 'rui-radio-group';
		for (const radio of radios) {
			radio.name = groupName;
			radio.disabled = this.disabled || radio.hasAttribute('data-disabled');
			radio.checked = this.value !== '' && radio.value === this.value;
		}
	}

	@onEvent({ selector: 'input[type="radio"]', type: 'change' })
	onRadioChange(event: Event): void {
		const input = event.target as HTMLInputElement;
		if (!input.checked) return;
		this.value = input.value;
		this.changeEvent.emit({ value: this.value });
	}
}
