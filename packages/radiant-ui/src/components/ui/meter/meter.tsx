import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiMeter as RuiMeterElement, RuiMeterProps } from './meter.script';
import './meter.script';
import type { WithoutChildren } from '../../../lib/without-children';

/**
 * JSX helper around `<rui-meter>`. Styling classes live on the element's
 * composed surface (`@cssclass` on `RuiMeterElement`). The element renders that
 * surface, so the view takes no children.
 */
export function RuiMeter(props: WithoutChildren<JsxCustomElementAttributes<RuiMeterElement, RuiMeterProps>>) {
	return <rui-meter {...props} />;
}
