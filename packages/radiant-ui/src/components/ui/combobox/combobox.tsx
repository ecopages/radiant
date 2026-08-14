import type { JsxCustomElementAttributes, JsxElementProps } from '@ecopages/jsx';
import { withDefaultAriaLabel } from '@/aria';
import { cx } from '@/lib/cx';
import { RuiIconChevronDown } from '@/lib/icons';
import { RuiAutocomplete, RuiAutocompleteCollection, RuiAutocompleteEmpty } from '../autocomplete';
import { RuiListbox, type RuiListboxOptionData } from '../listbox';
import type { RuiCombobox as RuiComboboxElement, RuiComboboxProps } from './combobox.script';
import './combobox.script';

export type RuiComboboxControlProps = JsxElementProps<HTMLDivElement>;

/** Input row wrapper for the combobox input and toggle button.
 *
 * @cssclass rui-combobox__control - Bordered control-height row.
 */
export function RuiComboboxControl({
	children,
	slot = 'control',
	class: className,
	...props
}: RuiComboboxControlProps) {
	return (
		<div {...props} slot={slot} class={cx('rui-combobox__control', className)}>
			{children}
		</div>
	);
}

export type RuiComboboxInputProps = JsxElementProps<HTMLInputElement> & {
	placeholder?: string;
	disabled?: boolean;
};

/** Text input with `role="combobox"`. Place inside `RuiComboboxControl`.
 *
 * @cssclass rui-combobox__input - Combobox text input.
 */
export function RuiComboboxInput({ placeholder, disabled, class: className, ...props }: RuiComboboxInputProps) {
	return (
		<input
			{...props}
			type="text"
			data-combobox-input
			data-autocomplete-input
			data-rui-control
			data-rui-control-type="text"
			class={cx('rui-combobox__input', className)}
			placeholder={placeholder}
			disabled={disabled}
			autocomplete="off"
		/>
	);
}

export type RuiComboboxTriggerProps = JsxElementProps<HTMLButtonElement> & {
	disabled?: boolean;
};

/** Toggle button for opening the listbox popup. */
export function RuiComboboxTrigger({ children, class: className, aria, disabled, ...props }: RuiComboboxTriggerProps) {
	return (
		<button
			{...props}
			aria={withDefaultAriaLabel(aria, 'Show suggestions')}
			type="button"
			data-combobox-trigger
			class={cx('rui-control-toggle', className)}
			disabled={disabled}
			tabIndex={-1}
		>
			{children ?? <RuiIconChevronDown />}
		</button>
	);
}

export type RuiComboboxListboxProps = JsxElementProps<HTMLDivElement>;

/** Popup shell slotted into `listbox`. Place an embedded `RuiListbox` inside.
 *
 * @cssclass rui-combobox__listbox - Popup shell (adds `rui-popover rui-popover--listbox rui-floating`).
 */
export function RuiComboboxListbox({
	children,
	slot = 'listbox',
	class: className,
	...props
}: RuiComboboxListboxProps) {
	return (
		<div
			{...props}
			slot={slot}
			data-combobox-listbox
			class={cx('rui-combobox__listbox rui-popover rui-popover--listbox rui-floating', className)}
			hidden
		>
			{children}
		</div>
	);
}

export type RuiComboboxOptionData = RuiListboxOptionData;

/**
 * Combobox view. Pair with `RuiLabel` (sibling or via `RuiField`) for the visible name —
 * do not nest a combobox-specific label.
 */
export function RuiCombobox({
	options,
	children,
	...props
}: JsxCustomElementAttributes<
	RuiComboboxElement,
	RuiComboboxProps & {
		options?: RuiComboboxOptionData[];
	}
>) {
	if (options != null) {
		return (
			<rui-combobox {...props}>
				<RuiComboboxControl>
					<RuiComboboxInput placeholder={props.placeholder} disabled={props.disabled} />
					<RuiComboboxTrigger />
				</RuiComboboxControl>
				<RuiComboboxListbox>
					<RuiAutocomplete>
						<RuiAutocompleteCollection>
							<RuiListbox embedded options={options} />
							<RuiAutocompleteEmpty>No results found.</RuiAutocompleteEmpty>
						</RuiAutocompleteCollection>
					</RuiAutocomplete>
				</RuiComboboxListbox>
			</rui-combobox>
		);
	}

	return <rui-combobox {...props}>{children}</rui-combobox>;
}
