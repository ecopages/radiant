import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiMeter as RuiMeterElement, RuiMeterProps } from './meter.script';
import './meter.script';

/**
 * JSX helper around `<rui-meter>`. Styling classes live on the element's
 * composed surface (`@cssclass` on `RuiMeterElement`).
 */
export function RuiMeter(props: JsxCustomElementAttributes<RuiMeterElement, RuiMeterProps>) {
	return <rui-meter {...props} />;
}
