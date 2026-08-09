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

type RuiRadioGroupBindings = {
	label: string;
	disabled: boolean;
};

/**
 * `<rui-radio-group>` — a set of radio buttons where only one option may
 * be selected at a time.
 *
 * Implements the WAI-ARIA APG Radio Group pattern using native
 * `<input type="radio">` controls inside a `role="radiogroup"` container.
 * Arrow-key navigation and Space activation are provided by the browser.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/radio/
 *
 * Keyboard interaction (native radio group):
 * - `Tab` / `Shift+Tab`: move focus into and out of the group
 * - `Arrow` keys: move selection between radios
 * - `Space`: check the focused radio
 *
 * @element rui-radio-group
 *
 * @attr {string} value - Selected radio value. Reflects to markup. Default: `''`.
 * @attr {string} name - Form field name shared by all radios in the group. Default: `''`.
 * @attr {string} label - Accessible name when no visible legend is slotted. Default: `''`.
 * @attr {boolean} disabled - Disables every radio in the group. Default: `false`.
 *
 * @slot - One or more `<label>` children each wrapping a radio input with a unique `value`.
 *
 * @fires rui-change - Emitted after the selected value changes; `detail.value` holds the new value.
 *
 * @remarks
 * The `RuiRadioGroup` view authors the option BEM classes (`.rui-radio*`, see
 * `@cssclass` there). This element owns the `role="radiogroup"` surface and value sync.
 *
 * @cssclass rui-radio-group - Group surface (`role="radiogroup"`).
 */
@customElement('rui-radio-group')
export class RuiRadioGroup extends RadiantElement<RuiRadioGroupBindings> {
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;
	@prop({ type: String, defaultValue: '' }) name: string;
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiRadioGroupChangeDetail>;

	private readonly resolvedAriaLabel = this.$.label.map((label) => label || undefined);
	private readonly resolvedAriaDisabled = this.$.disabled.map((disabled) => (disabled ? 'true' : undefined));

	override connectedCallback(): void {
		super.connectedCallback();
		this.syncRadios();
	}

	@onUpdated(['value', 'name', 'disabled'])
	syncRadios(): void {
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

	override render() {
		return (
			<div
				class="rui-radio-group"
				role="radiogroup"
				data-rui-control
				data-rui-control-type="text"
				aria-label={this.resolvedAriaLabel}
				aria-disabled={this.resolvedAriaDisabled}
			>
				<slot></slot>
			</div>
		);
	}
}
