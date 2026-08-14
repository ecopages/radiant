import type { JsxCustomElementAttributes, JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import type { RuiAutocomplete as RuiAutocompleteElement, RuiAutocompleteProps } from './autocomplete.script';
import './autocomplete.script';

export type RuiAutocompleteInputProps = JsxElementProps<HTMLInputElement> & {
	placeholder?: string;
	disabled?: boolean;
};

/** Search field slotted into `RuiAutocomplete`. Also pairs with combobox inputs via `data-autocomplete-input`.
 *
 * @cssclass rui-autocomplete__input - Bordered search input.
 */
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

export type RuiAutocompleteCollectionProps = JsxElementProps<HTMLDivElement>;

/** Wrapper around the filterable collection inside `RuiAutocomplete`.
 *
 * @cssclass rui-autocomplete__collection - Scrollable filterable region.
 */
export function RuiAutocompleteCollection({ children, class: className, ...props }: RuiAutocompleteCollectionProps) {
	return (
		<div {...props} data-autocomplete-collection class={cx('rui-autocomplete__collection', className)}>
			{children}
		</div>
	);
}

export type RuiAutocompleteEmptyProps = JsxElementProps<HTMLDivElement>;

/** Shown when filtering yields no visible items.
 *
 * @cssclass rui-autocomplete__empty - No-results state.
 */
export function RuiAutocompleteEmpty({ children, class: className, ...props }: RuiAutocompleteEmptyProps) {
	return (
		<div {...props} data-autocomplete-empty class={cx('rui-autocomplete__empty', className)} hidden>
			{children}
		</div>
	);
}

export function RuiAutocomplete({
	children,
	...props
}: JsxCustomElementAttributes<RuiAutocompleteElement, RuiAutocompleteProps>) {
	return <rui-autocomplete {...props}>{children}</rui-autocomplete>;
}
