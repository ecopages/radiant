import { RadiantElement, customElement, onUpdated, prop, state } from '@ecopages/radiant';

export type RuiMeterProps = {
	value?: number;
	min?: number;
	max?: number;
	label?: string;
};

type RuiMeterBindings = {
	value: number;
	min: number;
	max: number;
	label: string;
	percent: number;
};

/**
 * `<rui-meter>` — a graphical display of a numeric value within a range.
 *
 * Uses the native `<meter>` element, which maps to the APG Meter pattern.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/meter/
 *
 * @element rui-meter
 *
 * @attr {number} value - Current value. Default: `0`.
 * @attr {number} min - Range minimum. Default: `0`.
 * @attr {number} max - Range maximum. Default: `100`.
 * @attr {string} label - Text describing what is measured (also the accessible
 *   name). Default: `''`.
 *
 * @remarks
 * The bar itself is the native `<meter>` (`role="meter"` with
 * `aria-valuenow/min/max`); the CE composes label, bar, and a numeric readout
 * (`aria-hidden`) in a row. Styling classes are authored here.
 *
 * **Why a custom element?** The view wraps the native element to compose label
 * + value chrome; percent derivation from `value`/`min`/`max` is reactive prop
 * math, which a JSX view would need manual subscription for.
 *
 * @cssclass rui-meter - Root row (label, bar, value).
 * @cssclass rui-meter__label - Text describing the measurement.
 * @cssclass rui-meter__bar - The native `<meter>`.
 * @cssclass rui-meter__value - Numeric readout (`aria-hidden`).
 */
@customElement('rui-meter')
export class RuiMeter extends RadiantElement<RuiMeterBindings> {
	@prop({ type: Number, reflect: true, defaultValue: 0 }) value: number;
	@prop({ type: Number, defaultValue: 0 }) min: number;
	@prop({ type: Number, defaultValue: 100 }) max: number;
	@prop({ type: String, defaultValue: '' }) label: string;

	@state percent = 0;

	private readonly resolvedAriaLabel = this.$.label.map((label) => label || undefined);

	@onUpdated(['value', 'min', 'max'])
	onRangeUpdated(): void {
		this.percent = this.max === this.min ? 0 : Math.round(((this.value - this.min) / (this.max - this.min)) * 100);
	}

	override render() {
		return (
			<div class="rui-meter">
				{this.label ? <span class="rui-meter__label">{this.$.label}</span> : null}
				<meter
					class="rui-meter__bar"
					min={this.$.min}
					max={this.$.max}
					value={this.$.value}
					aria-label={this.resolvedAriaLabel}
				>
					{this.$.percent}%
				</meter>
				<span class="rui-meter__value" aria-hidden="true">
					{this.$.percent}%
				</span>
			</div>
		);
	}
}
