import type { JsxCustomElementAttributes, JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { formatNumericValue } from '../shared/numeric-range';
import {
	seedSliderView,
	type RuiSlider as RuiSliderElement,
	type RuiSliderProps,
} from './slider.script';
import './slider.script';

export type RuiSliderValueProps = JsxElementProps<HTMLSpanElement>;

/**
 * Live value readout for `RuiSlider`. Stamps `[data-ref="value"]`.
 * The host keeps this node in sync imperatively while dragging.
 *
 * @cssclass rui-slider__value - Numeric readout (`aria-hidden="true"`).
 */
export function RuiSliderValue({ children, class: className, ...props }: RuiSliderValueProps) {
	return (
		<span {...props} class={cx('rui-slider__value', className)} data-ref="value" aria-hidden="true">
			{children}
		</span>
	);
}

export type RuiSliderViewProps = JsxCustomElementAttributes<
	RuiSliderElement,
	RuiSliderProps & {
		values?: [number, number];
	}
>;

type SliderTrackProps = Omit<RuiSliderProps, 'value'> & {
	committed: number[];
	readoutPrecision: number;
	trackStyle: Record<string, string>;
};

function SliderTrack({
	disabled,
	min,
	max,
	label,
	variant,
	committed,
	readoutPrecision,
	trackStyle,
}: SliderTrackProps) {
	const single = variant !== 'range';
	const thumbLabel = label || 'Value';
	const start = committed[0];
	const end = committed.length === 2 ? committed[1] : committed[0];
	const startText = formatNumericValue(start, readoutPrecision);
	const endText = formatNumericValue(end, readoutPrecision);

	return (
		<div class="rui-slider__range">
			<div class="rui-slider__range-track" data-ref="rangeTrack" style={trackStyle}>
				<div class="rui-slider__range-fill" data-ref="rangeFill" />
				<button
					type="button"
					class="rui-slider__thumb"
					data-ref="singleThumb"
					data-thumb="value"
					role="slider"
					tabindex={disabled || !single ? -1 : 0}
					aria-label={thumbLabel}
					aria-valuemin={min}
					aria-valuemax={max}
					aria-valuenow={start}
					aria-valuetext={startText}
					disabled={disabled || !single}
					hidden={!single}
				/>
				<button
					type="button"
					class="rui-slider__thumb"
					data-ref="rangeMinThumb"
					data-thumb="min"
					role="slider"
					tabindex={disabled || single ? -1 : 0}
					aria-label={label ? `${label} minimum` : 'Minimum value'}
					aria-valuemin={min}
					aria-valuemax={end}
					aria-valuenow={start}
					aria-valuetext={startText}
					disabled={disabled || single}
					hidden={single}
				/>
				<button
					type="button"
					class="rui-slider__thumb"
					data-ref="rangeMaxThumb"
					data-thumb="max"
					role="slider"
					tabindex={disabled || single ? -1 : 0}
					aria-label={label ? `${label} maximum` : 'Maximum value'}
					aria-valuemin={start}
					aria-valuemax={max}
					aria-valuenow={end}
					aria-valuetext={endText}
					disabled={disabled || single}
					hidden={single}
				/>
			</div>
		</div>
	);
}

/**
 * Single- or dual-thumb slider. Stamps the full `[data-ref]` tree under `[data-ref="root"]`.
 * When `children` is omitted, supplies a default `RuiSliderValue` with `[data-default-value]`
 * that the host shows or hides through `showValue`. The default readout and track geometry
 * are seeded from the current value so SSR matches the hydrated control.
 *
 * @cssclass rui-slider - Root; wraps the label, track, and value readout.
 * @cssclass rui-slider--single - Single-thumb layout.
 * @cssclass rui-slider--range - Dual-thumb layout.
 * @cssclass rui-slider--vertical - Vertical track layout.
 * @cssclass rui-slider__header - Label + readout row.
 * @cssclass rui-slider__label - Optional visible label.
 * @cssclass rui-slider__range - Track wrapper.
 * @cssclass rui-slider__range-track - Track surface (`data-ref="rangeTrack"`).
 * @cssclass rui-slider__range-fill - Filled span between origin and value(s).
 * @cssclass rui-slider__thumb - Thumb button (`role="slider"`, `data-thumb`).
 */
export function RuiSlider({
	values,
	variant,
	orientation = 'horizontal',
	label,
	showValue = false,
	valueTitle = false,
	disabled,
	name,
	min,
	max,
	step,
	value,
	valuePrecision,
	minDistance,
	rangeMin,
	rangeMax,
	children,
	...props
}: RuiSliderViewProps) {
	const seed = seedSliderView({
		variant,
		values,
		value,
		rangeMin,
		rangeMax,
		min,
		max,
		step,
		minDistance,
		valuePrecision,
	});
	const valueReadout = children ?? (
		<RuiSliderValue data-default-value hidden={!showValue}>
			{seed.readoutText}
		</RuiSliderValue>
	);
	const hasVisibleReadout = Boolean(children) || showValue;

	return (
		<rui-slider
			{...props}
			variant={seed.variant}
			orientation={orientation}
			label={label}
			showValue={showValue}
			valueTitle={valueTitle}
			disabled={disabled}
			name={name}
			min={seed.min}
			max={seed.max}
			step={seed.step}
			value={seed.value}
			minDistance={seed.minDistance}
			rangeMin={seed.resolvedRangeMin}
			rangeMax={seed.resolvedRangeMax}
			valuePrecision={seed.valuePrecision}
		>
			<SliderRoot
				seed={seed}
				orientation={orientation}
				label={label}
				disabled={disabled}
				name={name}
				hasVisibleReadout={hasVisibleReadout}
				valueReadout={valueReadout}
			/>
		</rui-slider>
	);
}

function SliderRoot({
	seed,
	orientation,
	label,
	disabled,
	name,
	hasVisibleReadout,
	valueReadout,
}: {
	seed: ReturnType<typeof seedSliderView>;
	orientation: RuiSliderViewProps['orientation'];
	label: RuiSliderViewProps['label'];
	disabled: RuiSliderViewProps['disabled'];
	name: RuiSliderViewProps['name'];
	hasVisibleReadout: boolean;
	valueReadout: RuiSliderValueProps['children'];
}) {
	return (
		<div
			class={cx(
				'rui-slider',
				seed.isRange ? 'rui-slider--range' : 'rui-slider--single',
				orientation === 'vertical' && 'rui-slider--vertical',
			)}
			data-ref="root"
		>
			<div class="rui-slider__header" data-ref="header" hidden={!label && !hasVisibleReadout}>
				<span class="rui-slider__label" data-ref="label" hidden={!label}>
					{label}
				</span>
				{valueReadout}
			</div>
			<SliderTrack
				disabled={disabled}
				min={seed.min}
				max={seed.max}
				label={label}
				variant={seed.variant}
				committed={seed.committed}
				readoutPrecision={seed.readoutPrecision}
				trackStyle={seed.trackStyle}
			/>
			<input type="hidden" data-ref="input" name={name || undefined} value={String(seed.committed[0])} />
			<input
				type="hidden"
				data-ref="maxInput"
				name={seed.isRange && name ? `${name}-max` : undefined}
				value={seed.isRange ? String(seed.committed[1]) : undefined}
			/>
		</div>
	);
}
