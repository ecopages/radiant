import { RadiantElement, customElement, event, onEvent, onUpdated, prop, query } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { createNumericRange, valueFromSliderKey } from '../shared/numeric-range';
import { createKnobRing, knobValueFromPointer } from './knob-geometry';

export type RuiKnobValuePosition = 'center' | 'below';

export type RuiKnobProps = {
	value?: number;
	min?: number;
	max?: number;
	step?: number;
	/**
	 * Maximum fraction digits in the value readout and `aria-valuetext`.
	 * Defaults to the decimal places in `step`.
	 */
	valuePrecision?: number;
	disabled?: boolean;
	readOnly?: boolean;
	label?: string;
	name?: string;
	size?: number;
	strokeWidth?: number;
	showValue?: boolean;
	valuePosition?: RuiKnobValuePosition;
	valueTemplate?: string;
};

export type RuiKnobChangeDetail = { value: number };

/**
 * `<rui-knob>` — select a numeric value with a rotary control.
 *
 * The 300° visual arc leaves a gap below the control so its minimum and maximum
 * positions remain distinct. It implements the WAI-ARIA slider keyboard model.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/slider/
 *
 * @element rui-knob
 *
 * @attr {number} value - Selected value. Reflects to markup. Default: `50`.
 * @attr {number} min - Range minimum. Default: `0`.
 * @attr {number} max - Range maximum. Default: `100`.
 * @attr {number} step - Pointer and keyboard snap interval. Default: `1`.
 * @attr {number} value-precision - Maximum fraction digits in the value readout. Defaults to the decimal places in `step`.
 * @attr {boolean} disabled - Disables interaction. Default: `false`.
 * @attr {boolean} read-only - Blocks value changes while leaving the control focusable. Default: `false`.
 * @attr {string} label - Visible and accessible name. Default: `''`.
 * @attr {string} name - Form field name for the hidden numeric input. Default: `''`.
 * @attr {number} size - Explicit visible SVG diameter in pixels. Overrides `--rui-knob-size`.
 * @attr {number} stroke-width - Width of the progress ring in view-box units. Default: `14`.
 * @attr {boolean} show-value - Shows the formatted value inside the ring. Default: `true`.
 * @attr {('center'|'below')} value-position - Readout placement. Default: `center`.
 * @attr {string} value-template - Readout template; `{value}` is replaced by the formatted value. Default: `'{value}'`.
 *
 * @fires rui-change - Emitted as the pointer or keyboard changes the value; `detail.value` holds the new number.
 *
 * @cssprop --rui-knob-track-color - Ring color behind the selected value. Defaults to `--surface`.
 * @cssprop --rui-knob-value-color - Selected ring color. Defaults to `--primary`.
 * @cssprop --rui-knob-text-color - Value readout color. Defaults to `--on-surface`.
 * @cssprop --rui-knob-size - Visible SVG diameter. Defaults to `3rem`.
 * @cssprop --rui-knob-focus-ring - Focus indicator color. Defaults to `--focus-ring`.
 * @cssprop --rui-knob-focus-ring-width - Focus indicator width. Defaults to `2px`.
 *
 * @cssclass rui-knob - Root; wraps the optional label and knob button.
 * @cssclass rui-knob--value-below - Root with the value readout below the button.
 * @cssclass rui-knob__label - Optional visible label.
 * @cssclass rui-knob__control - Focusable `role="slider"` button and pointer target.
 * @cssclass rui-knob__svg - SVG ring.
 * @cssclass rui-knob__track - Unfilled 300° range arc.
 * @cssclass rui-knob__progress - Filled range arc.
 * @cssclass rui-knob__value - Value readout inside the ring.
 *
 * @remarks
 * `valuePrecision` formats the readout only. Committed values stay on the stepped model;
 * round or transform them in application code when needed.
 */
@customElement('rui-knob')
export class RuiKnob extends RadiantElement {
	@prop({ type: Number, reflect: true, defaultValue: 50 }) value: number;
	@prop({ type: Number, defaultValue: 0 }) min: number;
	@prop({ type: Number, defaultValue: 100 }) max: number;
	@prop({ type: Number, defaultValue: 1 }) step: number;
	@prop({ type: Number, attribute: 'value-precision', defaultValue: Number.NaN }) valuePrecision: number;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;
	@prop({ type: Boolean, attribute: 'read-only', reflect: true, defaultValue: false }) readOnly: boolean;
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: String, defaultValue: '' }) name: string;
	@prop({ type: Number }) size: number | undefined;
	@prop({ type: Number, attribute: 'stroke-width', defaultValue: 14 }) strokeWidth: number;
	@prop({ type: Boolean, attribute: 'show-value', defaultValue: true }) showValue: boolean;
	@prop({ type: String, attribute: 'value-position', defaultValue: 'center' }) valuePosition: RuiKnobValuePosition;
	@prop({ type: String, attribute: 'value-template', defaultValue: '{value}' }) valueTemplate: string;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiKnobChangeDetail>;

	@query({ ref: 'root' }) rootTarget: HTMLElement;
	@query({ ref: 'label' }) labelTarget: HTMLElement;
	@query({ ref: 'control' }) controlTarget: HTMLButtonElement;
	@query({ ref: 'track' }) trackTarget: SVGCircleElement;
	@query({ ref: 'progress' }) progressTarget: SVGCircleElement;
	@query({ ref: 'centerValue' }) centerValueTarget: HTMLElement;
	@query({ ref: 'belowValue' }) belowValueTarget: HTMLElement;
	@query({ ref: 'input' }) inputTarget: HTMLInputElement;

	private activePointerId: number | null = null;
	private lastEmitted: number | null = null;

	protected override onConnected(): void {
		this.syncPresentation();
	}

	@onUpdated([
		'value',
		'min',
		'max',
		'step',
		'valuePrecision',
		'disabled',
		'readOnly',
		'name',
		'label',
		'size',
		'strokeWidth',
		'showValue',
		'valuePosition',
		'valueTemplate',
	])
	onPropsUpdated(): void {
		this.syncPresentation();
	}

	private get numericRange() {
		return createNumericRange(this.min, this.max, this.step);
	}

	private get resolvedSize(): number | undefined {
		return typeof this.size === 'number' && Number.isFinite(this.size) && this.size > 0 ? this.size : undefined;
	}

	private get resolvedValuePosition(): RuiKnobValuePosition {
		return this.valuePosition === 'below' ? 'below' : 'center';
	}

	private paint(value: number): void {
		const ring = createKnobRing(
			value,
			this.min,
			this.max,
			this.step,
			this.strokeWidth,
			this.valueTemplate,
			this.valuePrecision,
		);
		const valuePosition = this.resolvedValuePosition;

		this.rootTarget?.classList.toggle('rui-knob--value-below', valuePosition === 'below');
		this.labelTarget?.toggleAttribute('hidden', !this.label);
		if (this.labelTarget) {
			this.labelTarget.textContent = this.label;
		}

		if (this.resolvedSize) {
			this.style.setProperty('--rui-knob-size', `${this.resolvedSize}px`);
		} else {
			this.style.removeProperty('--rui-knob-size');
		}

		if (this.controlTarget) {
			this.controlTarget.setAttribute('aria-valuemin', String(this.numericRange.lowerBound));
			this.controlTarget.setAttribute('aria-valuemax', String(this.numericRange.upperBound));
			this.controlTarget.setAttribute('aria-valuenow', String(value));
			this.controlTarget.setAttribute('aria-valuetext', ring.valueText);
			if (this.label) {
				this.controlTarget.setAttribute('aria-label', this.label);
			} else {
				this.controlTarget.removeAttribute('aria-label');
			}
			this.controlTarget.setAttribute('aria-readonly', String(this.readOnly));
			this.controlTarget.disabled = this.disabled;
		}

		for (const circle of [this.trackTarget, this.progressTarget]) {
			circle?.setAttribute('r', String(ring.radius));
			circle?.setAttribute('stroke-width', String(ring.strokeWidth));
		}
		this.trackTarget?.setAttribute('stroke-dasharray', `${ring.arcLength} ${ring.circumference}`);
		this.progressTarget?.setAttribute('stroke-dasharray', `${ring.progressLength} ${ring.circumference}`);

		for (const [target, visible] of [
			[this.centerValueTarget, this.showValue && valuePosition === 'center'],
			[this.belowValueTarget, this.showValue && valuePosition === 'below'],
		] as const) {
			if (!target) {
				continue;
			}
			target.textContent = ring.valueText;
			target.toggleAttribute('hidden', !visible);
		}

		if (this.inputTarget) {
			this.inputTarget.value = String(value);
			if (this.name) {
				this.inputTarget.name = this.name;
			} else {
				this.inputTarget.removeAttribute('name');
			}
			this.inputTarget.disabled = this.disabled;
		}
	}

	private syncPresentation(): void {
		const value = this.numericRange.clamp(this.value);
		this.paint(value);
		if (this.value !== value) {
			this.value = value;
		}
	}

	private commitValue(next: number): void {
		if (this.disabled || this.readOnly) {
			return;
		}

		const value = this.numericRange.clamp(next);
		this.paint(value);
		if (value === this.value) {
			return;
		}

		this.value = value;
		if (this.lastEmitted !== value) {
			this.lastEmitted = value;
			this.changeEvent.emit({ value });
		}
	}

	@onEvent({ ref: 'control', type: 'pointerdown' })
	onPointerDown(event: PointerEvent): void {
		if (event.button !== 0 || this.disabled || this.readOnly) {
			return;
		}

		this.activePointerId = event.pointerId;
		this.lastEmitted = this.value;
		this.controlTarget.setPointerCapture(event.pointerId);
		const rect = this.controlTarget.getBoundingClientRect();
		const value = knobValueFromPointer(event.clientX, event.clientY, rect, this.numericRange);
		if (value != null) {
			this.commitValue(value);
		}
		event.preventDefault();
	}

	@onEvent({ ref: 'control', type: 'pointermove' })
	onPointerMove(event: PointerEvent): void {
		if (event.pointerId !== this.activePointerId) {
			return;
		}

		const rect = this.controlTarget.getBoundingClientRect();
		const value = knobValueFromPointer(event.clientX, event.clientY, rect, this.numericRange);
		if (value != null) {
			this.commitValue(value);
		}
	}

	@onEvent({ ref: 'control', type: 'pointerup' })
	onPointerUp(event: PointerEvent): void {
		if (event.pointerId !== this.activePointerId) {
			return;
		}

		this.controlTarget.releasePointerCapture(event.pointerId);
		this.activePointerId = null;
	}

	@onEvent({ ref: 'control', type: 'pointercancel' })
	onPointerCancel(event: PointerEvent): void {
		if (event.pointerId !== this.activePointerId) {
			return;
		}

		if (this.controlTarget.hasPointerCapture(event.pointerId)) {
			this.controlTarget.releasePointerCapture(event.pointerId);
		}
		this.activePointerId = null;
	}

	@onEvent({ ref: 'control', type: 'keydown' })
	onKeydown(event: KeyboardEvent): void {
		if (this.disabled || this.readOnly) {
			return;
		}

		const next = valueFromSliderKey(this.numericRange, this.value, event.key);
		if (next == null) {
			return;
		}

		event.preventDefault();
		this.lastEmitted = this.value;
		this.commitValue(next);
	}
}
