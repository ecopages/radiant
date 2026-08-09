import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import type { RuiDateRangePickerProps } from './date-range-picker.script';
import './date-range-picker.script';

/**
 * Locale-aware date range picker with text inputs and a range calendar popover.
 *
 * Pair with `RuiLabel` / `RuiField` for labeling and validation.
 */
export function RuiDateRangePicker({
	children,
	...props
}: JsxHtmlPropsWithChildren<RuiDateRangePickerProps & { slot?: string }>) {
	return <rui-date-range-picker {...props}>{children}</rui-date-range-picker>;
}
