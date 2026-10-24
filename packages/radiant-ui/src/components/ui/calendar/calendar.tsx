import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiCalendar as RuiCalendarElement, RuiCalendarProps } from './calendar.script';
import './calendar.script';
import type { WithoutChildren } from '../../../lib/without-children';

/** Month grid. The grid is rendered by `<rui-calendar>`, so the view takes no children. */
export function RuiCalendar(props: WithoutChildren<JsxCustomElementAttributes<RuiCalendarElement, RuiCalendarProps>>) {
	return <rui-calendar {...props} />;
}
