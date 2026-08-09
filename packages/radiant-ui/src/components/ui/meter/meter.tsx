import type { JsxHtmlProps } from '@ecopages/jsx';
import type { RuiMeterProps } from './meter.script';
import './meter.script';

/**
 * JSX helper around `<rui-meter>`. Styling classes live on the element's
 * composed surface (`@cssclass` on `RuiMeterElement`).
 */
export function RuiMeter(props: JsxHtmlProps<RuiMeterProps & { slot?: string }>) {
	return <rui-meter {...props} />;
}
