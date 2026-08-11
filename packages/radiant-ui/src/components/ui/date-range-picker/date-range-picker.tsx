import type { JsxHtmlProps, JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { RuiIconCalendar } from '@/lib/icons';
import { RuiCalendar, type RuiCalendarProps } from '../calendar';
import type { RuiDateRangePickerProps } from './date-range-picker.script';
import './date-range-picker.script';

export type RuiDateRangePickerControlProps = JsxHtmlPropsWithChildren;

/** Bordered control row containing the date inputs and calendar toggle. */
export function RuiDateRangePickerControl({ children, class: className, ...props }: RuiDateRangePickerControlProps) {
	return (
		<div {...props} class={cx('rui-date-range-picker', className)}>
			<div class="rui-date-range-picker__group">{children}</div>
		</div>
	);
}

export type RuiDateRangePickerInputsProps = JsxHtmlPropsWithChildren;

/** Input row for `RuiDateRangePickerStartInput` and `RuiDateRangePickerEndInput`. */
export function RuiDateRangePickerInputs({ children, class: className, ...props }: RuiDateRangePickerInputsProps) {
	return (
		<div {...props} class={cx('rui-date-range-picker__values', className)}>
			{children}
		</div>
	);
}

export type RuiDateRangePickerStartInputProps = JsxHtmlProps;

/** Start-date text input controlled by the range-picker host. */
export function RuiDateRangePickerStartInput({ class: className, ...props }: RuiDateRangePickerStartInputProps) {
	return (
		<input
			{...props}
			type="text"
			data-range-start
			data-rui-control
			data-rui-control-type="text"
			class={cx('rui-date-range-picker__input', className)}
			autocomplete="off"
		/>
	);
}

export type RuiDateRangePickerEndInputProps = JsxHtmlProps;

/** End-date text input controlled by the range-picker host. */
export function RuiDateRangePickerEndInput({ class: className, ...props }: RuiDateRangePickerEndInputProps) {
	return (
		<input
			{...props}
			type="text"
			data-range-end
			data-rui-control
			data-rui-control-type="text"
			class={cx('rui-date-range-picker__input', className)}
			autocomplete="off"
		/>
	);
}

export type RuiDateRangePickerSeparatorProps = JsxHtmlPropsWithChildren;

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

export type RuiDateRangePickerToggleProps = JsxHtmlPropsWithChildren<{ 'aria-label'?: string }>;

/** Toggle button for the range calendar. */
export function RuiDateRangePickerToggle({
	children,
	class: className,
	'aria-label': ariaLabel = 'Open calendar',
	...props
}: RuiDateRangePickerToggleProps) {
	return (
		<button
			{...props}
			type="button"
			data-ref="trigger"
			data-range-trigger
			class={cx('rui-control-toggle', className)}
			aria-label={ariaLabel}
			aria-haspopup="dialog"
		>
			{children ?? <RuiIconCalendar />}
		</button>
	);
}

export type RuiDateRangePickerPopoverProps = JsxHtmlPropsWithChildren;

/** Floating shell for a `RuiDateRangePickerCalendar`. */
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

export type RuiDateRangePickerCalendarProps = JsxHtmlProps<RuiCalendarProps>;

/** Calendar whose range value and constraints are synchronized by the range-picker host. */
export function RuiDateRangePickerCalendar(props: RuiDateRangePickerCalendarProps) {
	return <RuiCalendar {...props} data-range-calendar />;
}

export type RuiDateRangePickerViewProps = RuiDateRangePickerProps & {
	slot?: string;
	/** Accessible name for the default start-date input. */
	startLabel?: string;
	/** Accessible name for the default end-date input. */
	endLabel?: string;
};

/**
 * Locale-aware date range picker with text inputs and a range calendar popover.
 *
 * Pair with `RuiLabel` / `RuiField` for labeling and validation.
 */
export function RuiDateRangePicker({
	children,
	startLabel = 'Start date',
	endLabel = 'End date',
	...props
}: JsxHtmlPropsWithChildren<RuiDateRangePickerViewProps>) {
	return (
		<rui-date-range-picker {...props}>
			{children ?? (
				<>
					<RuiDateRangePickerControl>
						<RuiDateRangePickerInputs>
							<RuiDateRangePickerStartInput aria-label={startLabel} />
							<RuiDateRangePickerSeparator />
							<RuiDateRangePickerEndInput aria-label={endLabel} />
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
