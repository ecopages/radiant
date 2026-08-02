import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiDateFieldProps } from './date-field.script';
import { RuiDateField as RuiDateFieldElement } from './date-field.script';

/**
 * Locale-aware date field with optional digit masking, flexible parsing, and a calendar popover.
 *
 * Pair with `RuiLabel` / `RuiField` for labeling and validation.
 */
export const RuiDateField = defineRadiantView(
	RuiDateFieldElement,
	({ children, ...props }: JsxHtmlPropsWithChildren<RuiDateFieldProps & { slot?: string }>) => (
		<rui-date-field {...props}>{children}</rui-date-field>
	),
	{ stylesheets: ['./date-field.css', '../shared/control-toggle.css', '../../../lib/icons/icons.css', '../calendar/calendar.css'] },
);
