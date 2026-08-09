import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import type { RuiCalendarProps } from './calendar.script';
import './calendar.script';

export function RuiCalendar({ children, ...props }: JsxHtmlPropsWithChildren<RuiCalendarProps & { slot?: string }>) {
	return <rui-calendar {...props}>{children}</rui-calendar>;
}
