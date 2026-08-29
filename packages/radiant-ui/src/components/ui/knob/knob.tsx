import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { createNumericRange } from '../shared/numeric-range';
import { createKnobRing } from './knob-geometry';
import type { RuiKnob as RuiKnobElement, RuiKnobProps } from './knob.script';
import './knob.script';

/**
 * Rotary numeric control. Stamps the full `[data-ref]` tree under `[data-ref="root"]`.
 *
 * @cssclass rui-knob - Root; wraps the label and knob button.
 * @cssclass rui-knob--value-below - Root with the value readout below the button.
 * @cssclass rui-knob__label - Optional visible label.
 * @cssclass rui-knob__control - Focusable `role="slider"` button (`data-ref="control"`).
 * @cssclass rui-knob__svg - SVG ring.
 * @cssclass rui-knob__track - Unfilled 300° range arc.
 * @cssclass rui-knob__progress - Filled range arc.
 * @cssclass rui-knob__value - Value readout inside or below the ring.
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
	valuePrecision,
	...props
}: JsxCustomElementAttributes<RuiKnobElement, RuiKnobProps>) {
	const range = createNumericRange(min, max, step);
	const resolvedValue = range.clamp(value);
	const ring = createKnobRing(resolvedValue, min, max, step, strokeWidth, valueTemplate, valuePrecision);
	return (
		<KnobSurface
			props={props}
			value={resolvedValue}
			min={min}
			max={max}
			step={step}
			disabled={disabled}
			readOnly={readOnly}
			label={label}
			name={name}
			size={size}
			strokeWidth={strokeWidth}
			showValue={showValue}
			valuePosition={valuePosition}
			valueTemplate={valueTemplate}
			valuePrecision={valuePrecision}
			ring={ring}
			range={range}
		/>
	);
}

type KnobSurfaceProps = {
	props: Omit<JsxCustomElementAttributes<RuiKnobElement, RuiKnobProps>, keyof RuiKnobProps>;
	value: number;
	min: number;
	max: number;
	step: number;
	disabled: boolean;
	readOnly: boolean;
	label: string | undefined;
	name: string | undefined;
	size: number | undefined;
	strokeWidth: number;
	showValue: boolean;
	valuePosition: RuiKnobProps['valuePosition'];
	valueTemplate: string;
	valuePrecision: number | undefined;
	ring: ReturnType<typeof createKnobRing>;
	range: ReturnType<typeof createNumericRange>;
};

function KnobSurface({ props, ring, range, ...knob }: KnobSurfaceProps) {
	return (
		<rui-knob
			{...props}
			value={knob.value}
			min={knob.min}
			max={knob.max}
			step={knob.step}
			disabled={knob.disabled}
			prop:readOnly={knob.readOnly}
			label={knob.label}
			name={knob.name}
			size={knob.size}
			strokeWidth={knob.strokeWidth}
			showValue={knob.showValue}
			valuePosition={knob.valuePosition}
			valueTemplate={knob.valueTemplate}
			valuePrecision={knob.valuePrecision}
			style={knob.size ? { '--rui-knob-size': `${knob.size}px` } : undefined}
		>
			<KnobBody knob={knob} ring={ring} range={range} />
		</rui-knob>
	);
}

function KnobBody({
	knob,
	ring,
	range,
}: Pick<KnobSurfaceProps, 'ring' | 'range'> & { knob: Omit<KnobSurfaceProps, 'props' | 'ring' | 'range'> }) {
	const valueBelow = knob.valuePosition === 'below';
	return (
		<div class={valueBelow ? 'rui-knob rui-knob--value-below' : 'rui-knob'} data-ref="root">
			<span class="rui-knob__label" data-ref="label" hidden={!knob.label}>
				{knob.label}
			</span>
			<KnobControl knob={knob} ring={ring} range={range} valueBelow={valueBelow} />
			<span
				class="rui-knob__value rui-knob__value--below"
				data-ref="belowValue"
				aria-hidden="true"
				hidden={!knob.showValue || !valueBelow}
			>
				{ring.valueText}
			</span>
			<input data-ref="input" type="hidden" name={knob.name || undefined} value={knob.value} />
		</div>
	);
}

function KnobControl({
	knob,
	ring,
	range,
	valueBelow,
}: Pick<KnobSurfaceProps, 'ring' | 'range'> & {
	knob: Omit<KnobSurfaceProps, 'props' | 'ring' | 'range'>;
	valueBelow: boolean;
}) {
	return (
		<button
			type="button"
			class="rui-knob__control"
			data-ref="control"
			data-knob-control
			role="slider"
			aria-label={knob.label || undefined}
			aria-valuemin={range.lowerBound}
			aria-valuemax={range.upperBound}
			aria-valuenow={knob.value}
			aria-valuetext={ring.valueText}
			aria-readonly={knob.readOnly}
			disabled={knob.disabled}
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
				hidden={!knob.showValue || valueBelow}
			>
				{ring.valueText}
			</span>
		</button>
	);
}
