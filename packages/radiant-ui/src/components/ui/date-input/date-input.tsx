import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiDateInput as RuiDateInputElement, RuiDateInputProps } from './date-input.script';
import './date-input.script';

/**
 * Segment date editor. Stamps `data-rui-control` so `RuiField` can discover the host.
 * The segment tree is rendered by `<rui-date-input>`, so the view takes no children.
 */
export function RuiDateInput(
	props: JsxCustomElementAttributes<RuiDateInputElement, RuiDateInputProps> & { children?: never },
) {
	return (
		<rui-date-input
			data-rui-control
			data-rui-control-type="date"
			data-rui-aria-target='[data-ref="root"]'
			{...props}
		/>
	);
}
