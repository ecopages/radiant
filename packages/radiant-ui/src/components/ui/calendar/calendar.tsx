import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiCalendar as RuiCalendarElement, RuiCalendarProps } from './calendar.script';
import './calendar.script';

export function RuiCalendar({ children, ...props }: JsxCustomElementAttributes<RuiCalendarElement, RuiCalendarProps>) {
	return <rui-calendar {...props}>{children}</rui-calendar>;
}
