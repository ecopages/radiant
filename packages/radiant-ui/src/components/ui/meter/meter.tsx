import type { JsxHtmlProps } from '@ecopages/jsx';
import type { RuiMeterProps } from './meter.script';
import './meter.script';

export function RuiMeter(props: JsxHtmlProps<RuiMeterProps & { slot?: string }>) {
	return <rui-meter {...props} />;
}
