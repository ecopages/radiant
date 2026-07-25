import { RadiantElement } from '@ecopages/radiant/core/radiant-element';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { event } from '@ecopages/radiant/decorators/event';
import { onEvent } from '@ecopages/radiant/decorators/on-event';
import { prop } from '@ecopages/radiant/decorators/prop';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';

export type RuiSwitchProps = {
	/** Whether the switch is on. Reflects to markup. Default: `false`. */
	checked?: boolean;
	/** Disable the switch. Default: `false`. */
	disabled?: boolean;
	/** Associates the control with a form field name. */
	name?: string;
};

export type RuiSwitchChangeDetail = {
	checked: boolean;
};

/**
 * `<rui-switch>` — a binary on/off control.
 *
 * Implements the WAI-ARIA APG Switch pattern using a native
 * `<input type="checkbox" role="switch">` wrapped in a `<label>`. The browser
 * owns activation (click on label or control, Space when focused); no click
 * delegation is required. The HTML `checked` attribute conveys state.
 *
 * Prefer Switch over Checkbox when the UI communicates on/off (for example
 * enabling notifications) rather than checked/unchecked membership in a set.
 *
 * Important: the accessible label must not change when the switch state changes.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/switch/
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/switch/examples/switch-checkbox/
 *
 * Keyboard interaction (native to the checkbox):
 * - `Space`: toggle the switch
 *
 * @element rui-switch
 * @slot - Visible label for the switch. Must not change with state.
 * @fires rui-change - Emitted after the checked state changes; `detail.checked` holds the new state.
 */
@customElement('rui-switch')
export class RuiSwitch extends RadiantElement {
	@prop({ type: Boolean, reflect: true, defaultValue: false }) checked: boolean;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;
	@prop({ type: String, defaultValue: '' }) name: string;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiSwitchChangeDetail>;

	@onEvent({ ref: 'input', type: 'change' })
	onInputChange(event: Event): void {
		const input = event.target as HTMLInputElement;
		this.checked = input.checked;
		this.changeEvent.emit({ checked: this.checked });
	}

	override render() {
		return (
			<label class="rui-switch">
				<input
					type="checkbox"
					role="switch"
					data-ref="input"
					data-rui-control
					data-rui-control-type="boolean"
					class="rui-switch__input"
					checked={this.checked}
					disabled={this.disabled}
					name={this.name || undefined}
				/>
				<span class="rui-switch__track" aria-hidden="true">
					<span class="rui-switch__thumb"></span>
				</span>
				<span class="rui-switch__label">
					<slot></slot>
				</span>
			</label>
		);
	}
}
