import type { JsxCustomElementAttributes, JsxElementProps, JsxRenderable } from '@ecopages/jsx';
import { withDefaultAriaLabel } from '@/aria';
import { cx } from '@/lib/cx';
import { RuiIconChevronDown, RuiIconX } from '@/lib/icons';
import { RuiListbox, type RuiListboxOptionData } from '../listbox';
import { parseViewValue, serializeViewValue } from '../shared/multi-value';
import { RuiTagGroup } from '../tag-group';
import type { RuiSelect as RuiSelectElement, RuiSelectProps } from './select.script';
import './select.script';

export type RuiSelectControlProps = JsxElementProps<HTMLDivElement>;

/**
 * Trigger row wrapper for the value button and toggle icon.
 *
 * @cssclass rui-select__control - Trigger row; bordered, control-height surface.
 */
export function RuiSelectControl({ children, class: className, ...props }: RuiSelectControlProps) {
	return (
		<div {...props} class={cx('rui-select__control', className)}>
			{children}
		</div>
	);
}

export type RuiSelectTriggerProps = JsxElementProps<HTMLDivElement> & {
	disabled?: boolean;
};

/**
 * Combobox surface. Stamps `[data-select-trigger]`. Place `RuiSelectValue` inside.
 *
 * @remarks A native `<button>` cannot wrap multi-select chip remove controls
 * (`<button>` in `<button>`). The host sets `role="combobox"`.
 *
 * @cssclass rui-select__trigger - Combobox surface; `role="combobox"` set by the controller.
 */
export function RuiSelectTrigger({ children, class: className, disabled, ...props }: RuiSelectTriggerProps) {
	return (
		<div
			{...props}
			data-select-trigger
			data-rui-control
			data-rui-control-type="text"
			class={cx('rui-select__trigger', className)}
			tabIndex={disabled ? -1 : 0}
			aria-disabled={disabled ? 'true' : undefined}
		>
			{children}
		</div>
	);
}

export type RuiSelectToggleProps = JsxElementProps<HTMLButtonElement> & {
	disabled?: boolean;
};

/** Toggle button for opening the listbox popup. Stamps `[data-select-toggle]`. Children replace the default chevron icon. */
export function RuiSelectToggle({ children, class: className, aria, disabled, ...props }: RuiSelectToggleProps) {
	return (
		<button
			{...props}
			aria={withDefaultAriaLabel(aria, 'Show options')}
			type="button"
			data-select-toggle
			class={cx('rui-control-toggle', className)}
			disabled={disabled}
			tabIndex={-1}
		>
			{children ?? <RuiIconChevronDown />}
		</button>
	);
}

export type RuiSelectClearProps = JsxElementProps<HTMLButtonElement> & {
	disabled?: boolean;
};

/** Clears the current selection. Stamps `[data-select-clear]`. Place next to `RuiSelectToggle`. Children replace the default close icon. */
export function RuiSelectClear({ children, class: className, aria, disabled, ...props }: RuiSelectClearProps) {
	return (
		<button
			{...props}
			aria={withDefaultAriaLabel(aria, 'Clear selection')}
			type="button"
			data-select-clear
			class={cx('rui-control-clear', className)}
			disabled={disabled}
		>
			{children ?? <RuiIconX />}
		</button>
	);
}

export type RuiSelectValueProps = JsxElementProps<HTMLSpanElement>;

/**
 * Selected value display inside `RuiSelectTrigger`. Stamps `[data-select-value]`.
 *
 * @remarks When empty, shows the select `placeholder`. For the `options` API,
 * the view SSRs the resolved label (or placeholder) so the control height does
 * not collapse before client sync. For multi-select chip UI, provide
 * `RuiTagGroup` as children instead of relying on the default text.
 *
 * @cssclass rui-select__value - Selected value / placeholder text.
 */
export function RuiSelectValue({ children, class: className, ...props }: RuiSelectValueProps) {
	return (
		<span {...props} data-select-value class={cx('rui-select__value', className)}>
			{children}
		</span>
	);
}

export type RuiSelectListboxProps = JsxElementProps<HTMLDivElement>;

/**
 * Popup shell. Stamps `[data-select-listbox]`. Place an embedded `RuiListbox` inside.
 *
 * @cssclass rui-select__listbox - Popup shell; composes `rui-popover` surface roles.
 */
export function RuiSelectListbox({ children, class: className, ...props }: RuiSelectListboxProps) {
	return (
		<div
			{...props}
			data-select-listbox
			class={cx('rui-select__listbox rui-popover rui-popover--listbox rui-floating', className)}
		>
			{children}
		</div>
	);
}

export type RuiSelectSearchProps = JsxElementProps<HTMLInputElement> & {
	placeholder?: string;
	disabled?: boolean;
};

/**
 * Search input for filtering inside `RuiAutocomplete` within a select listbox.
 * Stamps `[data-autocomplete-input]`.
 *
 * @cssclass rui-select__search - Filtering input inside the popup.
 */
export function RuiSelectSearch({ placeholder, class: className, disabled, ...props }: RuiSelectSearchProps) {
	return (
		<input
			{...props}
			type="search"
			data-autocomplete-input
			class={cx('rui-select__search', className)}
			placeholder={placeholder}
			disabled={disabled}
			autocomplete="off"
		/>
	);
}

export type RuiSelectOptionData = RuiListboxOptionData;

function resolveSelectDisplayText(
	options: RuiSelectOptionData[] | undefined,
	value: string | string[] | undefined,
	placeholder: unknown,
): string {
	const selected = parseViewValue(value)[0] ?? '';
	const fallback = typeof placeholder === 'string' ? placeholder : '';
	if (!selected) {
		return fallback;
	}

	const match = options?.find((option) => option.value === selected);
	if (!match) {
		return selected;
	}
	return typeof match.label === 'string' ? match.label : selected;
}

/**
 * Select view. Wraps children in `[data-ref="root"]`. Pass `options` for the
 * simple API, or compose `RuiSelect*` children.
 */
export type RuiSelectViewProps = JsxCustomElementAttributes<
	RuiSelectElement,
	Omit<RuiSelectProps, 'value'> & {
		options?: RuiSelectOptionData[];
		value?: string | string[];
	}
>;

function SelectShell({ children }: { children: JsxRenderable }) {
	return (
		<div class="rui-select" data-ref="root">
			{children}
		</div>
	);
}

export function RuiSelect({ options, children, value, ...props }: RuiSelectViewProps) {
	const serializedValue = serializeViewValue(value);
	const selectedValues = parseViewValue(value);
	const isMultiple = props.selectionMode === 'multiple';
	const displayText = options != null ? resolveSelectDisplayText(options, value, props.placeholder) : '';
	const selectedTags = options
		?.filter((option) => selectedValues.includes(option.value))
		.map((option) => ({ value: option.value, label: option.label }));

	return (
		<rui-select {...props} value={serializedValue}>
			<SelectShell>
				{options == null ? (
					children
				) : (
					<>
						<RuiSelectControl>
							<RuiSelectTrigger disabled={props.disabled}>
								<RuiSelectValue>
									{isMultiple ? (
										<RuiTagGroup tags={selectedTags ?? []} label="Selected options" />
									) : (
										displayText
									)}
								</RuiSelectValue>
							</RuiSelectTrigger>
							<RuiSelectToggle />
						</RuiSelectControl>
						<RuiSelectListbox>
							<RuiListbox
								embedded
								options={options}
								selectionMode={props.selectionMode}
								value={serializedValue}
							/>
						</RuiSelectListbox>
					</>
				)}
			</SelectShell>
		</rui-select>
	);
}
