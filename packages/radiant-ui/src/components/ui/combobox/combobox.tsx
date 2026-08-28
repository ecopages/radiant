import type { JsxCustomElementAttributes, JsxElementProps, JsxRenderable } from '@ecopages/jsx';
import { withDefaultAriaLabel } from '@/aria';
import { cx } from '@/lib/cx';
import { RuiIconChevronDown, RuiIconX } from '@/lib/icons';
import { RuiAutocomplete, RuiAutocompleteCollection, RuiAutocompleteEmpty } from '../autocomplete';
import { RuiListbox, type RuiListboxOptionData } from '../listbox';
import { parseViewValue, serializeViewValue } from '../shared/multi-value';
import { RuiTagGroup } from '../tag-group';
import type { RuiCombobox as RuiComboboxElement, RuiComboboxProps } from './combobox.script';
import './combobox.script';

export type RuiComboboxControlProps = JsxElementProps<HTMLDivElement>;

/** Input row wrapper for the combobox input and toggle button.
 *
 * @cssclass rui-combobox__control - Bordered control-height row.
 */
export function RuiComboboxControl({ children, class: className, ...props }: RuiComboboxControlProps) {
	return (
		<div {...props} class={cx('rui-combobox__control', className)}>
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

/** Toggle button for opening the listbox popup. Children replace the default chevron icon. */
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

export type RuiComboboxClearProps = JsxElementProps<HTMLButtonElement> & {
	disabled?: boolean;
};

/** Clears the current selection; place next to `RuiComboboxTrigger`. Children replace the default close icon. */
export function RuiComboboxClear({ children, class: className, aria, disabled, ...props }: RuiComboboxClearProps) {
	return (
		<button
			{...props}
			aria={withDefaultAriaLabel(aria, 'Clear selection')}
			type="button"
			data-combobox-clear
			class={cx('rui-control-clear', className)}
			disabled={disabled}
		>
			{children ?? <RuiIconX />}
		</button>
	);
}

export type RuiComboboxValueProps = JsxElementProps<HTMLSpanElement>;

/** Selected-value region for multiple comboboxes; place before the input. */
export function RuiComboboxValue({ children, class: className, ...props }: RuiComboboxValueProps) {
	return (
		<span {...props} data-combobox-value class={cx('rui-combobox__value', className)}>
			{children}
		</span>
	);
}

export type RuiComboboxListboxProps = JsxElementProps<HTMLDivElement>;

/** Popup shell for the combobox listbox. Place an embedded `RuiListbox` inside.
 *
 * @cssclass rui-combobox__listbox - Popup shell (adds `rui-popover rui-popover--listbox rui-floating`).
 */
export function RuiComboboxListbox({ children, class: className, ...props }: RuiComboboxListboxProps) {
	return (
		<div
			{...props}
			data-combobox-listbox
			class={cx('rui-combobox__listbox rui-popover rui-popover--listbox rui-floating', className)}
		>
			{children}
		</div>
	);
}

export type RuiComboboxOptionData = RuiListboxOptionData;

function ComboboxShell({ children }: { children: JsxRenderable }) {
	return (
		<div class="rui-combobox" data-ref="root">
			{children}
		</div>
	);
}

/**
 * Combobox view. Pair with `RuiLabel` (sibling or via `RuiField`) for the visible name —
 * do not nest a combobox-specific label.
 */
export function RuiCombobox({
	options,
	children,
	value,
	...props
}: JsxCustomElementAttributes<
	RuiComboboxElement,
	Omit<RuiComboboxProps, 'value'> & {
		options?: RuiComboboxOptionData[];
		value?: string | string[];
	}
>) {
	const serializedValue = serializeViewValue(value);
	const selectedValues = parseViewValue(value);
	const selectedTags = options
		?.filter((option) => selectedValues.includes(option.value))
		.map((option) => ({ value: option.value, label: option.label }));
	const isMultiple = props.selectionMode === 'multiple';
	if (options != null) {
		return (
			<rui-combobox {...props} value={serializedValue}>
				<ComboboxShell>
					<RuiComboboxControl>
						{isMultiple ? (
							<RuiComboboxValue>
								<RuiTagGroup tags={selectedTags ?? []} label="Selected options" />
							</RuiComboboxValue>
						) : null}
						<RuiComboboxInput placeholder={props.placeholder} disabled={props.disabled} />
						<RuiComboboxTrigger />
					</RuiComboboxControl>
					<RuiComboboxListbox>
						<RuiAutocomplete>
							<RuiAutocompleteCollection>
								<RuiListbox
									embedded
									options={options}
									selectionMode={props.selectionMode}
									value={serializedValue}
								/>
								<RuiAutocompleteEmpty>No results found.</RuiAutocompleteEmpty>
							</RuiAutocompleteCollection>
						</RuiAutocomplete>
					</RuiComboboxListbox>
				</ComboboxShell>
			</rui-combobox>
		);
	}

	return (
		<rui-combobox {...props} value={serializedValue}>
			<ComboboxShell>{children}</ComboboxShell>
		</rui-combobox>
	);
}
