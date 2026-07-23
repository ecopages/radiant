import { RadiantElement } from '@ecopages/radiant/core/radiant-element';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { prop } from '@ecopages/radiant/decorators/prop';

export type RuiMeterProps = {
	value?: number;
	min?: number;
	max?: number;
	label?: string;
};

/**
 * `<rui-meter>` — a graphical display of a numeric value within a range.
 *
 * Uses the native `<meter>` element, which maps to the APG Meter pattern.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/meter/
 * @element rui-meter
 */
@customElement('rui-meter')
export class RuiMeter extends RadiantElement {
	@prop({ type: Number, reflect: true, defaultValue: 0 }) value: number;
	@prop({ type: Number, defaultValue: 0 }) min: number;
	@prop({ type: Number, defaultValue: 100 }) max: number;
	@prop({ type: String, defaultValue: '' }) label: string;

	override render() {
		const percent = this.max === this.min ? 0 : Math.round(((this.value - this.min) / (this.max - this.min)) * 100);
		return (
			<div class="rui-meter">
				{this.label ? <span class="rui-meter__label">{this.label}</span> : null}
				<meter
					class="rui-meter__bar"
					min={this.min}
					max={this.max}
					value={this.value}
					aria-label={this.label || undefined}
				>
					{percent}%
				</meter>
				<span class="rui-meter__value" aria-hidden="true">
					{percent}%
				</span>
			</div>
		);
	}
}
