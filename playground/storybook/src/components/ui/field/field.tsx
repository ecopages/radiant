import type { WithChildren } from '../../../types';
import { defineRadiantView } from '../../../lib/radiant-view';
import type { RuiFieldProps } from './field.script';
import { RuiField as RuiFieldElement } from './field.script';
import './field.css';

export const RuiField = defineRadiantView(
	RuiFieldElement,
	({
		name,
		rules,
		rulesData,
		defaultValue,
		defaultValueData,
		disabled,
		error,
		invalid,
		children,
	}: WithChildren<RuiFieldProps>) => (
		<rui-field
			name={name}
			prop:rules={rules}
			prop:defaultValue={defaultValue}
			disabled={disabled}
			error={error}
			invalid={invalid}
			rulesData={rulesData ?? (rules !== undefined ? JSON.stringify(rules) : undefined)}
			attr:data-rules={rulesData ?? (rules !== undefined ? JSON.stringify(rules) : undefined)}
			attr:data-default-value={
				defaultValueData ?? (defaultValue !== undefined ? JSON.stringify(defaultValue) : undefined)
			}
		>
			{children}
		</rui-field>
	),
);
