import type { JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { RUI_FIELD_DESCRIPTION_ATTR } from '../form/control-protocol';

export type RuiFieldDescriptionProps = JsxElementProps<HTMLParagraphElement>;

/**
 * Helper text associated with a field via `aria-describedby`.
 *
 * @cssclass rui-field__description - Helper text below the control.
 */
export function RuiFieldDescription({ children, class: className, ...props }: RuiFieldDescriptionProps) {
	return (
		<p {...props} {...{ [RUI_FIELD_DESCRIPTION_ATTR]: '' }} class={cx('rui-field__description', className)}>
			{children}
		</p>
	);
}
