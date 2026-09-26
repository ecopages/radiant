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
 * `<rui-meter>` — graphical display of a numeric value within a range.
 *
 * Derived Tree: the host `render()` owns the label, native `<meter>`, visual track, and percent
 * readout. Pass `value`, `min`, `max`, and `label` as attributes or props; there
 * is no authored light-DOM child contract.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/meter/
 * @element rui-meter
 * @attr {number} value - Current value. Default: `0`.
 * @attr {number} min - Range minimum. Default: `0`.
 * @attr {number} max - Range maximum. Default: `100`.
 * @attr {string} label - Text describing what is measured (accessible name). Default: `''`.
 *
 * @remarks
 * The visually hidden native `<meter>` retains range semantics. The track and fill
 * are presentational and follow the derived percent;
 * the numeric readout beside it is `aria-hidden`. Percent is derived reactively
 * from `value` / `min` / `max` and clamped to 0..100, matching the native `<meter>`.
 *
 * @cssclass rui-meter - Root row (label, bar, value).
 * @cssclass rui-meter__label - Text describing the measurement.
 * @cssclass rui-meter__bar - The visually hidden native `<meter>`.
 * @cssclass rui-meter__track - Presentational track.
 * @cssclass rui-meter__fill - Presentational fill.
 * @cssclass rui-meter__value - Numeric readout (`aria-hidden`).
 *
 * @cssprop --rui-meter-track-color - Bar track background. Default: `--rui-track-color` / `--rui-track-fill`.
 * @cssprop --rui-meter-fill-color - Filled portion. Default: `--primary`.
 * @cssprop --rui-meter-radius - Track and fill corner radius. Default: `--radius-control`.
 * @cssprop --rui-meter-height - Bar block size. Default: `0.75rem`.
 * @cssprop --rui-meter-width - Bar inline size. Default: `12rem`.
 */
@customElement('rui-meter')
export class RuiMeter extends RadiantElement<RuiMeterBindings> {
	@prop({ type: Number, reflect: true, defaultValue: 0 }) value: number;
	@prop({ type: Number, defaultValue: 0 }) min: number;
	@prop({ type: Number, defaultValue: 100 }) max: number;
	@prop({ type: String, defaultValue: '' }) label: string;

	@state percent = 0;

	private readonly resolvedAriaLabel = this.$.label.map((label) => label || undefined);
	private readonly trackStyle = this.$.percent.map((percent) => ({ '--rui-meter-percent': `${percent}%` }));

	@onUpdated(['value', 'min', 'max'])
	onRangeUpdated(): void {
		const percent = this.max === this.min ? 0 : Math.round(((this.value - this.min) / (this.max - this.min)) * 100);
		this.percent = Math.min(100, Math.max(0, percent));
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
				<div class="rui-meter__track" style={this.trackStyle} aria-hidden="true">
					<div class="rui-meter__fill" />
				</div>
				<span class="rui-meter__value" aria-hidden="true">
					{this.$.percent}%
				</span>
			</div>
		);
	}
}
