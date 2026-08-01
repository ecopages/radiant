import type { JsxRenderable } from '@ecopages/jsx';
import type { RadiantSlotProps } from '@/types';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiListboxProps } from './listbox.script';
import { RuiListbox as RuiListboxElement } from './listbox.script';

export type RuiListboxOption = { value: string; label: JsxRenderable; disabled?: boolean };

export const RuiListbox = defineRadiantView(
	RuiListboxElement,
	({
		slot,
		value,
		label,
		disabled,
		options,
	}: RuiListboxProps & RadiantSlotProps & { options: RuiListboxOption[] }) => (
		<rui-listbox slot={slot} value={value} label={label} disabled={disabled}>
			{options.map((option) => (
				<div
					class="rui-listbox__option"
					role="option"
					data-value={option.value}
					aria-disabled={option.disabled ? 'true' : undefined}
					tabindex={-1}
				>
					{option.label}
				</div>
			))}
		</rui-listbox>
	),

	{ stylesheets: ['./listbox.css'] },
);
