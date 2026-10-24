import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiCalendar as RuiCalendarElement, RuiCalendarProps } from './calendar.script';
import './calendar.script';

/** Month grid. The grid is rendered by `<rui-calendar>`, so the view takes no children. */
export function RuiCalendar(
	props: JsxCustomElementAttributes<RuiCalendarElement, RuiCalendarProps> & { children?: never },
) {
	return <rui-calendar {...props} />;
}
