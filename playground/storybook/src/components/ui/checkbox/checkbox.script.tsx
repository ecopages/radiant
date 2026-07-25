import { onUpdated } from '@ecopages/radiant';
import { RadiantElement } from '@ecopages/radiant/core/radiant-element';
import { bound } from '@ecopages/radiant/decorators/bound';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { event } from '@ecopages/radiant/decorators/event';
import { onEvent } from '@ecopages/radiant/decorators/on-event';
import { prop } from '@ecopages/radiant/decorators/prop';
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
	/** Disable the checkbox. Default: `false`. */
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
 * `<rui-checkbox>` — a dual-state or tri-state checkbox.
 *
 * Implements the WAI-ARIA APG Checkbox pattern on a native
 * `<input type="checkbox">`. Checked state uses the HTML `checked` attribute;
 * the mixed state uses the `indeterminate` IDL property with `aria-checked="mixed"`.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/
 *
 * Keyboard interaction (native to the checkbox):
 * - `Space`: toggle checked state
 *
 * @element rui-checkbox
 * @slot - Visible label for the checkbox.
 * @fires rui-change - Emitted after the checked/indeterminate state changes.
 */
@customElement('rui-checkbox')
export class RuiCheckbox extends RadiantElement {
	@prop({ type: Boolean, reflect: true, defaultValue: false }) checked: boolean;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) indeterminate: boolean;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;
	@prop({ type: String, defaultValue: 'on' }) value: string;
	@prop({ type: String, defaultValue: '' }) name: string;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiCheckboxChangeDetail>;

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => this.syncIndeterminate());
	}

	@bound
	@onUpdated(['indeterminate', 'checked'])
	syncIndeterminate(): void {
		const input = this.querySelector<HTMLInputElement>('input[type="checkbox"]');
		if (!input) return;
		input.indeterminate = this.indeterminate;
	}

	@onEvent({ ref: 'input', type: 'change' })
	onInputChange(event: Event): void {
		const input = event.target as HTMLInputElement;
		this.indeterminate = false;
		this.checked = input.checked;
		this.changeEvent.emit({ checked: this.checked, indeterminate: false });
	}

	override render() {
		return (
			<label class="rui-checkbox">
				<input
					type="checkbox"
					data-ref="input"
					data-rui-control
					data-rui-control-type="boolean"
					class="rui-checkbox__input"
					checked={this.checked}
					disabled={this.disabled}
					value={this.value}
					name={this.name || undefined}
					aria-checked={this.indeterminate ? 'mixed' : undefined}
				/>
				<span class="rui-checkbox__control" aria-hidden="true"></span>
				<span class="rui-checkbox__label">
					<slot></slot>
				</span>
			</label>
		);
	}
}
