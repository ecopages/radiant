import { RadiantElement, bindTo, customElement, event, onEvent, prop } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { nonEmpty } from '@/lib/non-empty';

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
 * The custom element is a behavior host: it does not render switch markup.
 * Import the script and place light-DOM children that match the contract below,
 * or use `RuiSwitch`, which stamps the same targets.
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
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-ref="input"]` — native `<input type="checkbox" role="switch">`. Host syncs
 *   `checked`, `disabled`, and `name`.
 *
 * Optional:
 * - Track, thumb, and label nodes — presentation only; the host does not query them.
 *
 * Do not fight host-owned input state (`checked`, `disabled`, `name`).
 *
 * Nested hosts: none.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/switch/
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/switch/examples/switch-checkbox/
 *
 * Keyboard interaction (native to the checkbox):
 * - `Space`: toggle the switch
 *
 * @element rui-switch
 * @attr {boolean} checked - Whether the switch is on. Default: `false`.
 * @attr {boolean} disabled - Disable the switch. Default: `false`.
 * @attr {string} name - Form field name on the inner input. Default: `''`.
 * @fires rui-change - Emitted after the checked state changes; `detail.checked` holds the new state.
 *
 * @cssprop --rui-switch-width - Track width. Default: `2.5rem`.
 * @cssprop --rui-switch-height - Track height. Default: `1.5rem`.
 * @cssprop --rui-switch-thumb-size - Thumb diameter. Default: `1rem`.
 * @cssprop --rui-switch-track - Off-track fill. Default: `--on-background` at 20%.
 * @cssprop --rui-switch-track-hover - Off-track hover fill.
 * @cssprop --rui-switch-track-on - On-track fill. Default: `--primary`.
 * @cssprop --rui-switch-track-on-hover - On-track hover fill.
 * @cssprop --rui-switch-thumb - Off-thumb fill. Default: `--on-background`.
 * @cssprop --rui-switch-thumb-on - On-thumb fill. Default: `--on-primary`.
 *
 * @remarks
 * Minimum tree: `<input type="checkbox" role="switch" data-ref="input" data-rui-control>`.
 * BEM classes live on the view; the host never queries them.
 */
@customElement('rui-switch')
export class RuiSwitch extends RadiantElement {
	@prop({ type: Boolean, reflect: true, defaultValue: false })
	@bindTo({ ref: 'input', prop: 'checked' })
	checked: boolean;

	@prop({ type: Boolean, reflect: true, defaultValue: false })
	@bindTo({ ref: 'input', prop: 'disabled' })
	disabled: boolean;

	@prop({ type: String, defaultValue: '' })
	@bindTo({
		ref: 'input',
		attr: 'name',
		map: nonEmpty,
	})
	name: string;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiSwitchChangeDetail>;

	@onEvent({ ref: 'input', type: 'change' })
	onInputChange(event: Event): void {
		const input = event.target as HTMLInputElement;
		this.checked = input.checked;
		this.changeEvent.emit({ checked: this.checked });
	}
}
