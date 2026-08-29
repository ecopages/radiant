import type { JsxCustomElementAttributes, JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import type { RuiSlider as RuiSliderElement, RuiSliderProps } from './slider.script';
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

function SliderTrack({ disabled, min, max, label, variant }: Omit<RuiSliderProps, 'value'>) {
	const single = variant !== 'range';
	const thumbLabel = label || 'Value';

	return (
		<div class="rui-slider__range">
			<div class="rui-slider__range-track" data-ref="rangeTrack">
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
					aria-valuemax={max}
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
					aria-valuemin={min}
					aria-valuemax={max}
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
 * that the host shows or hides through `showValue`.
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
	variant = 'single',
	orientation = 'horizontal',
	label,
	showValue = false,
	valueTitle = false,
	disabled,
	name,
	min,
	max,
	children,
	...props
}: RuiSliderViewProps) {
	const valueReadout = children ?? <RuiSliderValue data-default-value hidden={!showValue} />;
	const hasVisibleReadout = Boolean(children) || showValue;

	return (
		<rui-slider
			{...props}
			variant={variant}
			orientation={orientation}
			label={label}
			showValue={showValue}
			valueTitle={valueTitle}
			disabled={disabled}
			name={name}
			min={min}
			max={max}
			rangeMin={values?.[0]}
			rangeMax={values?.[1]}
		>
			<div
				class={cx(
					'rui-slider',
					variant === 'range' ? 'rui-slider--range' : 'rui-slider--single',
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
				<SliderTrack disabled={disabled} min={min} max={max} label={label} variant={variant} />
				<input type="hidden" data-ref="input" name={name || undefined} />
				<input type="hidden" data-ref="maxInput" />
			</div>
		</rui-slider>
	);
}
