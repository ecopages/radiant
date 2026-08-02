import type { JsxHtmlProps, JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiAutocompleteProps } from './autocomplete.script';
import { RuiAutocomplete as RuiAutocompleteElement } from './autocomplete.script';

export type RuiAutocompleteInputProps = JsxHtmlProps<{
	slot?: string;
	placeholder?: string;
	'aria-label'?: string;
	disabled?: boolean;
}>;

/** Search field slotted into `RuiAutocomplete`. Also pairs with combobox inputs via `data-autocomplete-input`. */
export function RuiAutocompleteInput({
	placeholder,
	slot = 'input',
	class: className,
	disabled,
	...props
}: RuiAutocompleteInputProps) {
	return (
		<input
			{...props}
			type="search"
			slot={slot}
			data-autocomplete-input
			class={cx('rui-autocomplete__input', className)}
			placeholder={placeholder}
			disabled={disabled}
			autocomplete="off"
		/>
	);
}

export type RuiAutocompleteCollectionProps = JsxHtmlPropsWithChildren<{
	slot?: string;
}>;

/** Wrapper around the filterable collection inside `RuiAutocomplete`. */
export function RuiAutocompleteCollection({ children, class: className, ...props }: RuiAutocompleteCollectionProps) {
	return (
		<div {...props} data-autocomplete-collection class={cx('rui-autocomplete__collection', className)}>
			{children}
		</div>
	);
}

export type RuiAutocompleteEmptyProps = JsxHtmlPropsWithChildren;

/** Shown when filtering yields no visible items. */
export function RuiAutocompleteEmpty({ children, class: className, ...props }: RuiAutocompleteEmptyProps) {
	return (
		<div {...props} data-autocomplete-empty class={cx('rui-autocomplete__empty', className)} hidden>
			{children}
		</div>
	);
}

export const RuiAutocomplete = defineRadiantView(
	RuiAutocompleteElement,
	({ children, ...props }: JsxHtmlPropsWithChildren<RuiAutocompleteProps & { slot?: string }>) => (
		<rui-autocomplete {...props}>{children}</rui-autocomplete>
	),
	{ stylesheets: ['./autocomplete.css'] },
);
