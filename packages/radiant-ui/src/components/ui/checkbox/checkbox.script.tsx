import { RadiantElement, bound, customElement, event, onEvent, onUpdated, prop, query } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';

export type RuiCheckboxProps = {
	/** Whether the checkbox is checked. Default: `false`. */
	checked?: boolean;
	/**
	 * Partially checked (mixed) state for group controllers.
	 * When `true`, the native input's `indeterminate` IDL is set and
	 * `aria-checked="mixed"` is exposed. Default: `false`.
	 */
	indeterminate?: boolean;
	/**
	 * Disable the checkbox. Default: `false`.
	 *
	 * @remarks The view stamps `data-disabled` so a parent group can restore
	 * item-level disabled after a group-level disable.
	 */
	disabled?: boolean;
	/** Value submitted with forms when checked. */
	value?: string;
	/** Associates the control with a form field name. */
	name?: string;
};

export type RuiCheckboxChangeDetail = {
	checked: boolean;
	indeterminate: boolean;
};

/**
 * Default submitted value for a checkbox.
 *
 * @remarks Must match the host `@prop` default: the SSR view seeds the inner
 * `<input>` with it so form submission works before hydration.
 */
export const CHECKBOX_DEFAULT_VALUE = 'on';

/**
 * `<rui-checkbox>` — a dual-state or tri-state checkbox.
 *
 * The custom element is a behavior host: it does not render checkbox markup.
 * Import the script and place light-DOM children that match the contract below,
 * or use `RuiCheckbox`, which stamps the same targets.
 *
 * Implements the WAI-ARIA APG Checkbox pattern on a native
 * `<input type="checkbox">`. Checked state uses the HTML `checked` attribute;
 * the mixed state uses the `indeterminate` IDL property with `aria-checked="mixed"`.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-ref="input"]` — native `<input type="checkbox">`. Host syncs `checked`,
 *   `indeterminate`, `disabled`, `value`, `name`, and `aria-checked="mixed"` when
 *   `indeterminate` is true.
 *
 * Optional:
 * - Label row and visible label text — presentation only; the host does not query them.
 *
 * Do not fight host-owned input state (`checked`, `indeterminate`, `disabled`, `value`,
 * `name`, `aria-checked`). Author `data-disabled` on the host when the view needs a
 * stable disabled marker for group controllers.
 *
 * Nested hosts: none.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/
 *
 * Keyboard interaction (native to the checkbox):
 * - `Space`: toggle checked state
 *
 * @element rui-checkbox
 * @attr {boolean} checked - Whether the checkbox is checked. Default: `false`.
 * @attr {boolean} indeterminate - Partially checked (mixed) state. Default: `false`.
 * @attr {boolean} disabled - Disable the checkbox. Default: `false`.
 * @attr {string} value - Value submitted with forms when checked. Default: `on`.
 * @attr {string} name - Form field name on the inner input. Default: `''`.
 * @fires rui-change - Emitted after the checked/indeterminate state changes;
 *   `detail.checked` and `detail.indeterminate`.
 *
 * @remarks
 * Minimum tree: `<input type="checkbox" data-ref="input" data-rui-control>`.
 * BEM classes live on the view; the host never queries them.
 */
@customElement('rui-checkbox')
export class RuiCheckbox extends RadiantElement {
	@prop({ type: Boolean, reflect: true, defaultValue: false }) checked: boolean;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) indeterminate: boolean;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;
	@prop({ type: String, defaultValue: CHECKBOX_DEFAULT_VALUE }) value: string;
	@prop({ type: String, defaultValue: '' }) name: string;

	@query({ ref: 'input' }) inputTarget: HTMLInputElement;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiCheckboxChangeDetail>;

	protected override onConnected(): void {
		this.syncInputState();
	}

	@bound
	@onUpdated(['checked', 'indeterminate', 'disabled', 'value', 'name'])
	syncInputState(): void {
		const input = this.inputTarget;
		if (!input) {
			return;
		}

		input.checked = this.checked;
		input.indeterminate = this.indeterminate;
		input.disabled = this.disabled;
		input.value = this.value;
		if (this.name) {
			input.name = this.name;
		} else {
			input.removeAttribute('name');
		}

		if (this.indeterminate) {
			input.setAttribute('aria-checked', 'mixed');
		} else {
			input.removeAttribute('aria-checked');
		}
	}

	@onEvent({ ref: 'input', type: 'change' })
	onInputChange(event: Event): void {
		const input = event.target as HTMLInputElement;
		this.checked = input.checked;
		input.indeterminate = this.indeterminate;
		this.changeEvent.emit({ checked: this.checked, indeterminate: this.indeterminate });
	}
}
