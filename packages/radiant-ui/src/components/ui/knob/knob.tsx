import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { createNumericRange } from '../shared/numeric-range';
import { createKnobRing } from './knob-geometry';
import type { RuiKnob as RuiKnobElement, RuiKnobProps } from './knob.script';
import './knob.script';

/**
 * Rotary numeric control with a 300° value arc.
 *
 * @cssclass rui-knob - Root; wraps the label and knob button.
 * @cssclass rui-knob--value-below - Root with the value readout below the button.
 * @cssclass rui-knob__label - Optional visible label.
 * @cssclass rui-knob__control - Focusable `role="slider"` button and pointer target.
 * @cssclass rui-knob__svg - SVG ring.
 * @cssclass rui-knob__track - Unfilled 300° range arc.
 * @cssclass rui-knob__progress - Filled range arc.
 * @cssclass rui-knob__value - Value readout inside the ring.
 */
export function RuiKnob({
	value = 50,
	min = 0,
	max = 100,
	step = 1,
	disabled = false,
	readOnly = false,
	label,
	name,
	size,
	strokeWidth = 14,
	showValue = true,
	valuePosition = 'center',
	valueTemplate = '{value}',
	parseValue,
	precision,
	...props
}: JsxCustomElementAttributes<RuiKnobElement, RuiKnobProps>) {
	const rangeOptions = { precision, parseValue };
	const range = createNumericRange(min, max, step, rangeOptions);
	const resolvedValue = range.clamp(value);
	const ring = createKnobRing(resolvedValue, min, max, step, strokeWidth, valueTemplate, rangeOptions);
	const valueBelow = valuePosition === 'below';
	const sizeStyle = size ? { '--rui-knob-size': `${size}px` } : undefined;

	return (
		<rui-knob
			{...props}
			value={resolvedValue}
			min={min}
			max={max}
			step={step}
			disabled={disabled}
			prop:readOnly={readOnly}
			label={label}
			name={name}
			size={size}
			strokeWidth={strokeWidth}
			showValue={showValue}
			valuePosition={valuePosition}
			valueTemplate={valueTemplate}
			precision={precision}
			prop:parseValue={parseValue}
			style={sizeStyle}
		>
			<div class={valueBelow ? 'rui-knob rui-knob--value-below' : 'rui-knob'} data-ref="root">
				<span class="rui-knob__label" data-ref="label" hidden={!label}>
					{label}
				</span>
				<button
					type="button"
					class="rui-knob__control"
					data-ref="control"
					data-knob-control
					role="slider"
					aria-label={label || undefined}
					aria-valuemin={range.lowerBound}
					aria-valuemax={range.upperBound}
					aria-valuenow={resolvedValue}
					aria-valuetext={ring.valueText}
					aria-readonly={readOnly}
					disabled={disabled}
				>
					<svg class="rui-knob__svg" viewBox="0 0 100 100" aria-hidden="true">
						<circle
							class="rui-knob__track"
							data-ref="track"
							cx="50"
							cy="50"
							r={ring.radius}
							fill="none"
							stroke-width={ring.strokeWidth}
							stroke-dasharray={`${ring.arcLength} ${ring.circumference}`}
							transform={`rotate(${ring.startAngle} 50 50)`}
						/>
						<circle
							class="rui-knob__progress"
							data-ref="progress"
							cx="50"
							cy="50"
							r={ring.radius}
							fill="none"
							stroke-width={ring.strokeWidth}
							stroke-dasharray={`${ring.progressLength} ${ring.circumference}`}
							transform={`rotate(${ring.startAngle} 50 50)`}
						/>
					</svg>
					<span
						class="rui-knob__value"
						data-ref="centerValue"
						aria-hidden="true"
						hidden={!showValue || valueBelow}
					>
						{ring.valueText}
					</span>
				</button>
				<span
					class="rui-knob__value rui-knob__value--below"
					data-ref="belowValue"
					aria-hidden="true"
					hidden={!showValue || !valueBelow}
				>
					{ring.valueText}
				</span>
				<input data-ref="input" type="hidden" name={name || undefined} value={resolvedValue} />
			</div>
		</rui-knob>
	);
}
