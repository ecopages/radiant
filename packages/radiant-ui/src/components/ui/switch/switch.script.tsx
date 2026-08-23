import { RadiantElement, bound, customElement, event, onEvent, onUpdated, prop, query } from '@ecopages/radiant';
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
 * @fires rui-change - Emitted after the checked state changes; `detail.checked` holds the new state.
 * @cssclass rui-switch - Label row: track + thumb + visible label.
 * @cssclass rui-switch__input - Native `role="switch"` input (visually hidden).
 * @cssclass rui-switch__track - Pill track; `primary` fill when checked.
 * @cssclass rui-switch__thumb - Sliding thumb.
 * @cssclass rui-switch__label - Light-DOM label text.
 */
@customElement('rui-switch')
export class RuiSwitch extends RadiantElement {
	@prop({ type: Boolean, reflect: true, defaultValue: false }) checked: boolean;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;
	@prop({ type: String, defaultValue: '' }) name: string;

	@query({ ref: 'input' }) inputTarget: HTMLInputElement;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiSwitchChangeDetail>;

	protected override onConnected(): void {
		this.syncInputState();
	}

	@bound
	@onUpdated(['checked', 'disabled', 'name'])
	syncInputState(): void {
		const input = this.inputTarget;
		if (!input) {
			return;
		}

		input.checked = this.checked;
		input.disabled = this.disabled;
		if (this.name) {
			input.name = this.name;
		} else {
			input.removeAttribute('name');
		}
	}

	@onEvent({ ref: 'input', type: 'change' })
	onInputChange(event: Event): void {
		const input = event.target as HTMLInputElement;
		this.checked = input.checked;
		this.changeEvent.emit({ checked: this.checked });
	}
}
