import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import type { RuiDateFieldProps } from './date-field.script';
import './date-field.script';

/**
 * Locale-aware date field with optional digit masking, flexible parsing, and a calendar popover.
 *
 * Pair with `RuiLabel` / `RuiField` for labeling and validation.
 */
export function RuiDateField({ children, ...props }: JsxHtmlPropsWithChildren<RuiDateFieldProps & { slot?: string }>) {
	return <rui-date-field {...props}>{children}</rui-date-field>;
}
