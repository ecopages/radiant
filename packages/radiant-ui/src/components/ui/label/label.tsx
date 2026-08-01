import type { JsxRenderable } from '@ecopages/jsx';
import { attachRadiantStylesheets } from '@/lib/radiant-view';
import { RUI_FIELD_LABEL_ATTR } from '../form/control-protocol';

export type RuiLabelProps = {
	htmlFor?: string;
	class?: string;
	children: JsxRenderable;
};

/** Shared label styles for form fields. */
export function RuiLabel({ htmlFor, class: className, children }: RuiLabelProps) {
	return (
		<label
			{...{ [RUI_FIELD_LABEL_ATTR]: '' }}
			class={['rui-label', className].filter(Boolean).join(' ')}
			htmlFor={htmlFor}
		>
			{children}
		</label>
	);
}

attachRadiantStylesheets(RuiLabel, ['./label.css'], import.meta.url);
