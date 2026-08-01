import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { attachRadiantStylesheets } from '@/lib/radiant-view';
import { RUI_FIELD_LABEL_ATTR } from '../form/control-protocol';

export type RuiLabelProps = JsxHtmlPropsWithChildren<{
	htmlFor?: string;
}>;

/** Shared label styles for form fields. */
export function RuiLabel({ children, htmlFor, class: className, ...props }: RuiLabelProps) {
	return (
		<label {...props} {...{ [RUI_FIELD_LABEL_ATTR]: '' }} class={cx('rui-label', className)} htmlFor={htmlFor}>
			{children}
		</label>
	);
}

attachRadiantStylesheets(RuiLabel, ['./label.css'], import.meta.url);
