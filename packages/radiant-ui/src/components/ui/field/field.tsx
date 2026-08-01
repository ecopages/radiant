import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiFieldProps } from './field.script';
import { RuiField as RuiFieldElement } from './field.script';

export const RuiField = defineRadiantView(
	RuiFieldElement,
	({ children, rules, defaultValue, defaultValueData, ...props }: JsxHtmlPropsWithChildren<RuiFieldProps>) => (
		<rui-field
			{...props}
			prop:rules={rules}
			prop:defaultValue={defaultValue}
			attr:data-default-value={
				defaultValueData ?? (defaultValue !== undefined ? JSON.stringify(defaultValue) : undefined)
			}
		>
			{children}
		</rui-field>
	),
	{ stylesheets: ['./field.css'] },
);
