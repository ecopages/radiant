import type { JsxHtmlProps, JsxRenderable } from '@ecopages/jsx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiListboxProps } from './listbox.script';
import { RuiListbox as RuiListboxElement } from './listbox.script';

export type RuiListboxOption = { value: string; label: JsxRenderable; disabled?: boolean };

export const RuiListbox = defineRadiantView(
	RuiListboxElement,
	({ options, ...props }: JsxHtmlProps<RuiListboxProps & { slot?: string; options: RuiListboxOption[] }>) => (
		<rui-listbox {...props}>
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
