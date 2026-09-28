import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiDateInput as RuiDateInputElement, RuiDateInputProps } from './date-input.script';
import './date-input.script';

/**
 * Segment date editor. Stamps `data-rui-control` so `RuiField` can discover the host.
 * The segment tree is rendered by `<rui-date-input>`.
 */
export function RuiDateInput({
	children,
	...props
}: JsxCustomElementAttributes<RuiDateInputElement, RuiDateInputProps>) {
	return (
		<rui-date-input
			data-rui-control
			data-rui-control-type="date"
			data-rui-aria-target='[data-ref="root"]'
			{...props}
		>
			{children}
		</rui-date-input>
	);
}
