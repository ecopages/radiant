import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RuiDateInput as RuiDateInputElement, type RuiDateInputProps } from './date-input.script';
import type { WithoutChildren } from '../../../lib/without-children';

/**
 * Segment date editor. Stamps `data-rui-control` so `RuiField` can discover the host.
 * The segment tree is rendered by `<rui-date-input>`, so the view takes no children.
 */
export function RuiDateInput(
	props: WithoutChildren<JsxCustomElementAttributes<RuiDateInputElement, RuiDateInputProps>>,
) {
	return (
		<RuiDateInputElement
			data-rui-control
			data-rui-control-type="date"
			data-rui-aria-target='[data-ref="root"]'
			{...props}
		/>
	);
}
