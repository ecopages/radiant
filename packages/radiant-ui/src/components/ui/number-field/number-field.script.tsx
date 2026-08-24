import { RadiantElement, customElement, event, onEvent, onUpdated, prop, state } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import {
	formatNumber,
	parseFormatOptions,
	parseNumber,
	resolveLocale,
	snapToStep,
	type NumberFormatOptions,
} from '@/lib/intl-number';
import { syncFieldLabel } from '../shared/field-label';

export type RuiNumberFieldCommitBehavior = 'snap' | 'validate';

export type RuiNumberFieldProps = {
	value?: number;
	/** Initial value when uncontrolled. */
	defaultValue?: number;
	minValue?: number;
	maxValue?: number;
	step?: number;
	disabled?: boolean;
	readOnly?: boolean;
	/** Accessible name when there is no visible `RuiLabel` associated with the input. */
	label?: string;
	name?: string;
	/** BCP 47 locale tag, or comma-separated fallback list (e.g. `en-US,en`). */
	locale?: string;
	/** JSON-serialized `Intl.NumberFormatOptions`. */
	formatOptions?: string;
	/** Blur behavior after editing. Defaults to `snap`. */
	commitBehavior?: RuiNumberFieldCommitBehavior;
	incrementAriaLabel?: string;
	decrementAriaLabel?: string;
	/** Disables scroll-wheel value changes. */
	wheelDisabled?: boolean;
};

export type RuiNumberFieldChangeDetail = { value: number };

type RuiNumberFieldBindings = {
	value: number;
	disabled: boolean;
	readOnly: boolean;
	label: string;
	name: string;
	decreaseDisabled: boolean;
	increaseDisabled: boolean;
};

/**
 * `<rui-number-field>` — a locale-aware number input with optional stepper buttons.
 *
 * Implements the React Aria NumberField interaction model: formatted display via
 * `Intl.NumberFormat`, commit on blur/increment/decrement, and composable slots.
 *
 * Compose with `data-number-field-group`, `data-number-field-input`, and
 * `data-number-field-action` (see view helpers), or use the default markup from `RuiNumberField`.
 *
 * @see https://react-aria.adobe.com/NumberField
 *
 * @element rui-number-field
 *
 * @attr {number} value - Current value. Reflects to markup. Default: `undefined`.
 * @attr {number} default-value - Initial value when uncontrolled. Default: `undefined`.
 * @attr {number} min-value - Lower bound; steppers and arrow keys snap to it. Default: `-Infinity`.
 * @attr {number} max-value - Upper bound; steppers and arrow keys snap to it. Default: `Infinity`.
 * @attr {number} step - Increment/decrement and snap interval. Default: `1`.
 * @attr {boolean} disabled - Disables input and steppers. Default: `false`.
 * @attr {boolean} read-only - Blocks editing; the value still displays formatted. Default: `false`.
 * @attr {string} label - Accessible name when there is no visible `RuiLabel`. Default: `''`.
 * @attr {string} name - Form field name on the hidden value input. Default: `''`.
 * @attr {string} locale - BCP 47 locale tag, or comma-separated fallback list. Default: `''`.
 * @attr {string} format-options - JSON-serialized `Intl.NumberFormatOptions`. Default: `''`.
 * @attr {('snap'|'validate')} commit-behavior - Blur behavior after editing. Default: `snap`.
 * @attr {string} increment-aria-label - Accessible name for the increment stepper. Default: `Increment`.
 * @attr {string} decrement-aria-label - Accessible name for the decrement stepper. Default: `Decrement`.
 * @attr {boolean} wheel-disabled - Disables scroll-wheel value changes. Default: `false`.
 *
 * @fires rui-change - Emitted when a value is committed (blur, stepper, or keyboard);
 *   `detail.value` holds the new number.
 *
 * @cssclass rui-number-field - Root field wrapper.
 */
@customElement('rui-number-field')
export class RuiNumberField extends RadiantElement<RuiNumberFieldBindings> {
	@prop({ type: Number, reflect: true }) value: number | undefined;
	@prop({ type: Number, attribute: 'default-value' }) defaultValue: number | undefined;
	@prop({ type: Number, attribute: 'min-value', defaultValue: Number.NEGATIVE_INFINITY }) minValue: number;
	@prop({ type: Number, attribute: 'max-value', defaultValue: Number.POSITIVE_INFINITY }) maxValue: number;
	@prop({ type: Number, defaultValue: 1 }) step: number;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;
	@prop({ type: Boolean, attribute: 'read-only', reflect: true, defaultValue: false }) readOnly: boolean;
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: String, defaultValue: '' }) name: string;
	@prop({ type: String, defaultValue: '' }) locale: string;
	@prop({ type: String, attribute: 'format-options', defaultValue: '' }) formatOptions: string;
	@prop({ type: String, attribute: 'commit-behavior', defaultValue: 'snap' })
	commitBehavior: RuiNumberFieldCommitBehavior;
	@prop({ type: String, attribute: 'increment-aria-label', defaultValue: '' }) incrementAriaLabel: string;
	@prop({ type: String, attribute: 'decrement-aria-label', defaultValue: '' }) decrementAriaLabel: string;
	@prop({ type: Boolean, attribute: 'wheel-disabled', defaultValue: false }) wheelDisabled: boolean;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiNumberFieldChangeDetail>;

	@state decreaseDisabled = false;
	@state increaseDisabled = false;

	private editing = false;
	private draftValue = '';
	private initialized = false;

	private readonly uid = Math.random().toString(36).slice(2, 9);

	private get resolvedLocale(): string | string[] | undefined {
		return resolveLocale(this.locale);
	}

	private get resolvedFormatOptions(): NumberFormatOptions | undefined {
		return parseFormatOptions(this.formatOptions);
	}

	private get inputId(): string {
		return `rui-number-field-input-${this.uid}`;
	}

	private getNumericValue(): number {
		if (typeof this.value === 'number' && Number.isFinite(this.value)) {
			return this.value;
		}
		if (typeof this.defaultValue === 'number' && Number.isFinite(this.defaultValue)) {
			return this.defaultValue;
		}
		return 0;
	}

	private getInput(): HTMLInputElement | null {
		return this.querySelector<HTMLInputElement>('[data-number-field-input]');
	}

	private getHiddenInput(): HTMLInputElement | null {
		return this.querySelector<HTMLInputElement>('[data-number-field-value]');
	}

	private syncLabel(): void {
		const input = this.getInput();
		syncFieldLabel(this, input, {
			controlId: this.inputId,
			label: this.label,
			labelId: `rui-number-field-label-${this.uid}`,
		});
	}

	private syncInput(): void {
		const input = this.getInput();
		const hidden = this.getHiddenInput();
		if (!input) {
			return;
		}

		if (!input.id) {
			input.id = this.inputId;
		}

		const numericValue = this.getNumericValue();
		input.setAttribute('role', 'spinbutton');
		input.setAttribute('inputmode', 'decimal');
		input.toggleAttribute('data-disabled', this.disabled);
		input.toggleAttribute('data-readonly', this.readOnly);

		if (!Number.isFinite(this.minValue)) {
			input.removeAttribute('aria-valuemin');
		} else {
			input.setAttribute('aria-valuemin', String(this.minValue));
		}

		if (!Number.isFinite(this.maxValue)) {
			input.removeAttribute('aria-valuemax');
		} else {
			input.setAttribute('aria-valuemax', String(this.maxValue));
		}

		input.setAttribute('aria-valuenow', String(numericValue));

		if (!this.editing) {
			input.value = formatNumber(numericValue, this.resolvedLocale, this.resolvedFormatOptions);
		}

		if (hidden) {
			hidden.value = String(numericValue);
			if (this.name) {
				hidden.name = this.name;
			}
			hidden.disabled = this.disabled;
		}
	}

	private updateStepperState(): void {
		const value = this.getNumericValue();
		this.decreaseDisabled = this.disabled || this.readOnly || value <= this.minValue;
		this.increaseDisabled = this.disabled || this.readOnly || value >= this.maxValue;
		queueMicrotask(() => this.syncSlottedSteppers());
	}

	private syncSlottedSteppers(): void {
		const incrementLabel = this.incrementAriaLabel || 'Increment';
		const decrementLabel = this.decrementAriaLabel || 'Decrement';

		for (const button of this.querySelectorAll<HTMLButtonElement>('[data-number-field-action="decrement"]')) {
			button.disabled = this.decreaseDisabled;
			button.setAttribute('aria-label', decrementLabel);
		}

		for (const button of this.querySelectorAll<HTMLButtonElement>('[data-number-field-action="increment"]')) {
			button.disabled = this.increaseDisabled;
			button.setAttribute('aria-label', incrementLabel);
		}
	}

	private commitValue(next: number, force = false): void {
		let resolved = next;

		if (this.commitBehavior === 'snap' || force) {
			resolved = snapToStep(next, this.minValue, this.maxValue, this.step);
		}

		if (resolved === this.getNumericValue()) {
			this.editing = false;
			this.syncInput();
			this.updateStepperState();
			return;
		}

		this.value = resolved;
		this.changeEvent.emit({ value: resolved });
		this.editing = false;
		this.syncInput();
		this.updateStepperState();
	}

	private commitDraft(): void {
		const parsed = parseNumber(this.draftValue, this.resolvedLocale, this.resolvedFormatOptions);
		if (parsed == null) {
			this.editing = false;
			this.syncInput();
			return;
		}

		if (this.commitBehavior === 'validate') {
			if (parsed < this.minValue || parsed > this.maxValue) {
				this.editing = false;
				this.syncInput();
				return;
			}
		}

		this.commitValue(parsed);
	}

	private initialize(): void {
		if (this.initialized) {
			return;
		}
		this.initialized = true;

		if (this.value == null && this.defaultValue != null) {
			this.value = this.defaultValue;
		}

		this.syncLabel();
		this.syncInput();
		this.updateStepperState();
	}

	protected override onConnected(): void {
		this.initialize();
	}

	@onUpdated([
		'value',
		'defaultValue',
		'minValue',
		'maxValue',
		'step',
		'label',
		'disabled',
		'readOnly',
		'locale',
		'formatOptions',
		'commitBehavior',
	])
	onPropsUpdated(): void {
		this.syncLabel();
		this.syncInput();
		this.updateStepperState();
	}

	@onEvent({ selector: '[data-number-field-action="decrement"]', type: 'click' })
	decrement(event: Event): void {
		event.preventDefault();
		if (this.decreaseDisabled) {
			return;
		}
		this.commitValue(this.getNumericValue() - this.step, true);
	}

	@onEvent({ selector: '[data-number-field-action="increment"]', type: 'click' })
	increment(event: Event): void {
		event.preventDefault();
		if (this.increaseDisabled) {
			return;
		}
		this.commitValue(this.getNumericValue() + this.step, true);
	}

	@onEvent({ selector: '[data-number-field-input]', type: 'focus' })
	onInputFocus(event: Event): void {
		if (this.disabled || this.readOnly) {
			return;
		}

		const input = event.target as HTMLInputElement;
		this.editing = true;
		this.draftValue = String(this.getNumericValue());
		input.value = this.draftValue;
		input.select();
	}

	@onEvent({ selector: '[data-number-field-input]', type: 'blur' })
	onInputBlur(): void {
		if (!this.editing) {
			return;
		}
		this.commitDraft();
	}

	@onEvent({ selector: '[data-number-field-input]', type: 'input' })
	onInput(event: Event): void {
		if (this.disabled || this.readOnly) {
			return;
		}
		this.editing = true;
		this.draftValue = (event.target as HTMLInputElement).value;
	}

	@onEvent({ selector: '[data-number-field-input]', type: 'keydown' })
	onKeydown(event: KeyboardEvent): void {
		if (this.disabled || this.readOnly) {
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			this.increment(event);
			return;
		}
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			this.decrement(event);
			return;
		}
		if (event.key === 'Home' && Number.isFinite(this.minValue)) {
			event.preventDefault();
			this.commitValue(this.minValue, true);
			return;
		}
		if (event.key === 'End' && Number.isFinite(this.maxValue)) {
			event.preventDefault();
			this.commitValue(this.maxValue, true);
			return;
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			this.commitDraft();
			(this.getInput() as HTMLInputElement | null)?.blur();
		}
	}

	@onEvent({ selector: '[data-number-field-input]', type: 'wheel' })
	onWheel(event: WheelEvent): void {
		if (this.wheelDisabled || this.disabled || this.readOnly) {
			return;
		}

		const input = event.target as HTMLInputElement;
		if (document.activeElement !== input) {
			return;
		}

		event.preventDefault();
		if (event.deltaY < 0) {
			this.increment(event);
		} else if (event.deltaY > 0) {
			this.decrement(event);
		}
	}
}
