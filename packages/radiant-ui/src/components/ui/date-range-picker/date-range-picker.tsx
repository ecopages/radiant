import { parseIsoRange } from '@/lib/intl-date';
import type { JsxCustomElementAttributes, JsxElementProps } from '@ecopages/jsx';
import { withDefaultAriaLabel } from '@/aria';
import { cx } from '@/lib/cx';
import { RuiIconCalendar } from '@/lib/icons';
import { RuiCalendar, type RuiCalendarElement, type RuiCalendarProps } from '../calendar';
import { RuiDateInput, type RuiDateInputElement, type RuiDateInputProps } from '../date-input';
import type {
	RuiDateRangePicker as RuiDateRangePickerElement,
	RuiDateRangePickerProps,
} from './date-range-picker.script';
import './date-range-picker.script';
import '../date-input/date-input.script';

export type RuiDateRangePickerControlProps = JsxElementProps<HTMLDivElement>;

/** Bordered control row containing the date inputs and calendar toggle. */
export function RuiDateRangePickerControl({ children, class: className, ...props }: RuiDateRangePickerControlProps) {
	return (
		<div {...props} class={cx('rui-date-range-picker', className)}>
			<div class="rui-date-range-picker__group" data-ref="control">
				{children}
			</div>
		</div>
	);
}

export type RuiDateRangePickerInputsProps = JsxElementProps<HTMLDivElement>;

/** Input row for `RuiDateRangePickerStartInput` and `RuiDateRangePickerEndInput`. */
export function RuiDateRangePickerInputs({ children, class: className, ...props }: RuiDateRangePickerInputsProps) {
	return (
		<div {...props} class={cx('rui-date-range-picker__values', className)} data-ref="values">
			{children}
		</div>
	);
}

export type RuiDateRangePickerStartInputProps = JsxCustomElementAttributes<RuiDateInputElement, RuiDateInputProps>;

/** Start-date segments. Stamps `[data-range-start]`. */
export function RuiDateRangePickerStartInput({ class: className, ...props }: RuiDateRangePickerStartInputProps) {
	return <RuiDateInput {...props} data-range-start class={cx('rui-date-range-picker__input', className)} />;
}

export type RuiDateRangePickerEndInputProps = JsxCustomElementAttributes<RuiDateInputElement, RuiDateInputProps>;

/** End-date segments. Stamps `[data-range-end]`. */
export function RuiDateRangePickerEndInput({ class: className, ...props }: RuiDateRangePickerEndInputProps) {
	return <RuiDateInput {...props} data-range-end class={cx('rui-date-range-picker__input', className)} />;
}

export type RuiDateRangePickerSeparatorProps = JsxElementProps<HTMLSpanElement>;

/** Visual separator between the start and end inputs. */
export function RuiDateRangePickerSeparator({
	children = '–',
	class: className,
	...props
}: RuiDateRangePickerSeparatorProps) {
	return (
		<span {...props} class={cx('rui-date-range-picker__separator', className)} aria-hidden="true">
			{children}
		</span>
	);
}

export type RuiDateRangePickerToggleProps = JsxElementProps<HTMLButtonElement>;

/** Calendar toggle. Stamps `[data-range-trigger]` and `data-ref="trigger"`. */
export function RuiDateRangePickerToggle({
	children,
	class: className,
	aria,
	...props
}: RuiDateRangePickerToggleProps) {
	return (
		<button
			{...props}
			aria={withDefaultAriaLabel(aria, 'Open calendar')}
			type="button"
			data-ref="trigger"
			data-range-trigger
			class={cx('rui-control-toggle', className)}
			aria-haspopup="dialog"
		>
			{children ?? <RuiIconCalendar />}
		</button>
	);
}

export type RuiDateRangePickerPopoverProps = JsxElementProps<HTMLDivElement>;

/** Popup shell. Stamps `[data-range-popover]` and `data-ref="popover"`. */
export function RuiDateRangePickerPopover({ children, class: className, ...props }: RuiDateRangePickerPopoverProps) {
	return (
		<div
			{...props}
			data-ref="popover"
			data-range-popover
			class={cx('rui-date-range-picker__popover rui-popover rui-floating', className)}
			hidden
			role="dialog"
		>
			{children}
		</div>
	);
}

export type RuiDateRangePickerCalendarProps = JsxCustomElementAttributes<RuiCalendarElement, RuiCalendarProps>;

/** Nested `rui-calendar` in range mode. Stamps `[data-range-calendar]`. */
export function RuiDateRangePickerCalendar(props: RuiDateRangePickerCalendarProps) {
	return <RuiCalendar {...props} data-range-calendar />;
}

export type RuiDateRangePickerViewProps = JsxCustomElementAttributes<
	RuiDateRangePickerElement,
	RuiDateRangePickerProps
> & {
	/** Accessible name for the default start-date input. */
	startLabel?: string;
	/** Accessible name for the default end-date input. */
	endLabel?: string;
};

/**
 * Locale-aware date range picker with segment inputs and a range calendar popover.
 *
 * Pair with `RuiLabel` / `RuiField` for labeling and validation.
 */
export function RuiDateRangePicker(props: RuiDateRangePickerViewProps) {
	const {
		children,
		startLabel = 'Start date',
		endLabel = 'End date',
		value,
		min,
		max,
		disabled,
		readOnly,
		locale,
		startName,
		endName,
	} = props;
	const range = parseIsoRange(value ?? '');

	return (
		<rui-date-range-picker
			data-rui-aria-targets='[data-range-start] [data-ref="root"],[data-range-end] [data-ref="root"]'
			{...props}
		>
			{children ?? (
				<>
					<RuiDateRangePickerControl>
						<RuiDateRangePickerInputs>
							<RuiDateRangePickerStartInput
								aria-label={startLabel}
								value={range?.start}
								min={min}
								max={max}
								disabled={disabled}
								readOnly={readOnly}
								locale={locale}
								name={startName}
							/>
							<RuiDateRangePickerSeparator />
							<RuiDateRangePickerEndInput
								aria-label={endLabel}
								value={range?.end}
								min={min}
								max={max}
								disabled={disabled}
								readOnly={readOnly}
								locale={locale}
								name={endName}
							/>
						</RuiDateRangePickerInputs>
						<RuiDateRangePickerToggle />
					</RuiDateRangePickerControl>
					<RuiDateRangePickerPopover>
						<RuiDateRangePickerCalendar />
					</RuiDateRangePickerPopover>
				</>
			)}
		</rui-date-range-picker>
	);
}
