import type { JsxRenderable } from '@ecopages/jsx';
import type { RadiantSlotProps } from '@/types';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiRadioGroupProps } from './radio-group.script';
import { RuiRadioGroup as RuiRadioGroupElement } from './radio-group.script';

export type RuiRadioOption = {
	value: string;
	label: JsxRenderable;
	disabled?: boolean;
};

export const RuiRadioGroup = defineRadiantView(
	RuiRadioGroupElement,
	({
		slot,
		value,
		name,
		label,
		disabled,
		class: className,
		options,
	}: RuiRadioGroupProps &
		RadiantSlotProps & {
			class?: string;
			options: RuiRadioOption[];
		}) => (
		<rui-radio-group slot={slot} value={value} name={name} label={label} disabled={disabled} class={className}>
			{options.map((option) => (
				<label class="rui-radio">
					<input
						type="radio"
						class="rui-radio__input"
						value={option.value}
						disabled={option.disabled}
						data-disabled={option.disabled ? '' : undefined}
					/>
					<span class="rui-radio__control" aria-hidden="true"></span>
					<span class="rui-radio__label">{option.label}</span>
				</label>
			))}
		</rui-radio-group>
	),

	{ stylesheets: ['./radio-group.css'] },
);
