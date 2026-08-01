import type { JsxRenderable } from '@ecopages/jsx';
import { RUI_FIELD_DESCRIPTION_ATTR } from '../form/control-protocol';

export type RuiFieldDescriptionProps = {
	class?: string;
	children: JsxRenderable;
};

/** Helper text associated with a field via `aria-describedby`. */
export function RuiFieldDescription({ class: className, children }: RuiFieldDescriptionProps) {
	return (
		<p
			{...{ [RUI_FIELD_DESCRIPTION_ATTR]: '' }}
			class={['rui-field__description', className].filter(Boolean).join(' ')}
		>
			{children}
		</p>
	);
}
