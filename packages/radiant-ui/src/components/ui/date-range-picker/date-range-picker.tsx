import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiDateRangePickerProps } from './date-range-picker.script';
import { RuiDateRangePicker as RuiDateRangePickerElement } from './date-range-picker.script';

/**
 * Locale-aware date range picker with text inputs and a range calendar popover.
 *
 * Pair with `RuiLabel` / `RuiField` for labeling and validation.
 */
export const RuiDateRangePicker = defineRadiantView(
	RuiDateRangePickerElement,
	({ children, ...props }: JsxHtmlPropsWithChildren<RuiDateRangePickerProps & { slot?: string }>) => (
		<rui-date-range-picker {...props}>{children}</rui-date-range-picker>
	),
	{
		stylesheets: [
			'./date-range-picker.css',
			'../shared/control-toggle.css',
			'../../../lib/icons/icons.css',
			'../calendar/calendar.css',
		],
	},
);
