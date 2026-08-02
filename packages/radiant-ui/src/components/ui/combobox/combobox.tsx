import type { JsxHtmlProps, JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { RuiIconChevronDown } from '@/lib/icons';
import { defineRadiantView } from '@/lib/radiant-view';
import { RuiAutocomplete, RuiAutocompleteCollection, RuiAutocompleteEmpty } from '../autocomplete';
import { RuiListbox, RuiListboxOption, type RuiListboxOptionData } from '../listbox';
import type { RuiComboboxProps } from './combobox.script';
import { RuiCombobox as RuiComboboxElement } from './combobox.script';

export type RuiComboboxControlProps = JsxHtmlPropsWithChildren<{
	slot?: string;
}>;

/** Input row wrapper for the combobox input and toggle button. */
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

export type RuiComboboxInputProps = JsxHtmlProps<{
	placeholder?: string;
	disabled?: boolean;
}>;

/** Text input with `role="combobox"`. Place inside `RuiComboboxControl`. */
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

export type RuiComboboxTriggerProps = JsxHtmlPropsWithChildren<{
	'aria-label'?: string;
	disabled?: boolean;
}>;

/** Toggle button for opening the listbox popup. */
export function RuiComboboxTrigger({
	children,
	class: className,
	'aria-label': ariaLabel = 'Show suggestions',
	disabled,
	...props
}: RuiComboboxTriggerProps) {
	return (
		<button
			{...props}
			type="button"
			data-combobox-trigger
			class={cx('rui-control-toggle', className)}
			aria-label={ariaLabel}
			disabled={disabled}
			tabIndex={-1}
		>
			{children ?? <RuiIconChevronDown />}
		</button>
	);
}

export type RuiComboboxListboxProps = JsxHtmlPropsWithChildren<{
	slot?: string;
}>;

/** Popup shell slotted into `listbox`. Place an embedded `RuiListbox` inside. */
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

/** @deprecated Use `RuiListboxOption` */
export const RuiComboboxOption = RuiListboxOption;

/**
 * Combobox view. Pair with `RuiLabel` (sibling or via `RuiField`) for the visible name —
 * do not nest a combobox-specific label.
 */
export const RuiCombobox = defineRadiantView(
	RuiComboboxElement,
	({
		options,
		children,
		...props
	}: JsxHtmlPropsWithChildren<
		RuiComboboxProps & {
			slot?: string;
			options?: RuiComboboxOptionData[];
		}
	>) => {
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
	},
	{ stylesheets: ['./combobox.css', '../shared/control-toggle.css', '../../../lib/icons/icons.css'] },
);
