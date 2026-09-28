import type { JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { RUI_FIELD_LABEL_ATTR } from '../form/control-protocol';

export type RuiLabelProps = JsxElementProps<HTMLLabelElement> & {
	htmlFor?: string;
};

/**
 * Shared label styles for form fields.
 *
 * @remarks Sets `RUI_FIELD_LABEL_ATTR` so `RuiField` can discover it as the
 * field's label and wire `for`. Composed controls also set `aria-labelledby`
 * through `syncFieldLabel`.
 *
 * @cssclass rui-label - Form field label.
 */
export function RuiLabel({ children, htmlFor, class: className, ...props }: RuiLabelProps) {
	return (
		<label {...props} {...{ [RUI_FIELD_LABEL_ATTR]: '' }} class={cx('rui-label', className)} htmlFor={htmlFor}>
			{children}
		</label>
	);
}
