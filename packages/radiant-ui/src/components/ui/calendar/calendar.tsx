import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiCalendarProps } from './calendar.script';
import { RuiCalendar as RuiCalendarElement } from './calendar.script';

export const RuiCalendar = defineRadiantView(
	RuiCalendarElement,
	({ children, ...props }: JsxHtmlPropsWithChildren<RuiCalendarProps & { slot?: string }>) => (
		<rui-calendar {...props}>{children}</rui-calendar>
	),
	{ stylesheets: ['./calendar.css'] },
);
