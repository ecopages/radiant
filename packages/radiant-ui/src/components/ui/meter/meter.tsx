import type { JsxHtmlProps } from '@ecopages/jsx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiMeterProps } from './meter.script';
import { RuiMeter as RuiMeterElement } from './meter.script';

export const RuiMeter = defineRadiantView(
	RuiMeterElement,
	(props: JsxHtmlProps<RuiMeterProps & { slot?: string }>) => <rui-meter {...props} />,
	{ stylesheets: ['./meter.css'] },
);
