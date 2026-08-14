import type { JsxCustomElementAttributes, JsxElementProps } from '@ecopages/jsx';
import { withDefaultAriaLabel } from '@/aria';
import { cx } from '@/lib/cx';
import { omitProps } from '@/lib/omit-props';
import { RuiIconChevronDown } from '@/lib/icons';
import { RuiListbox, type RuiListboxOptionData } from '../listbox';
import type { RuiSelect as RuiSelectElement, RuiSelectProps } from './select.script';
import './select.script';

export type RuiSelectControlProps = JsxElementProps<HTMLDivElement>;

/**
 * Trigger row wrapper for the value button and toggle icon.
 *
 * @cssclass rui-select__control - Trigger row; bordered, control-height surface.
 */
export function RuiSelectControl({ children, slot = 'trigger', class: className, ...props }: RuiSelectControlProps) {
	return (
		<div {...props} slot={slot} class={cx('rui-select__control', className)}>
			{children}
		</div>
	);
}

export type RuiSelectTriggerProps = JsxElementProps<HTMLButtonElement> & {
	disabled?: boolean;
};

/**
 * Value button with `role="combobox"`. Place `RuiSelectValue` inside.
 *
 * @cssclass rui-select__trigger - Value button; `role="combobox"` set by the controller.
 */
export function RuiSelectTrigger({ children, class: className, disabled, ...props }: RuiSelectTriggerProps) {
	return (
		<button
			{...omitProps(props, 'attr:type')}
			type="button"
			data-select-trigger
			data-rui-control
			data-rui-control-type="text"
			class={cx('rui-select__trigger', className)}
			disabled={disabled}
		>
			{children}
		</button>
	);
}

export type RuiSelectToggleProps = JsxElementProps<HTMLButtonElement> & {
	disabled?: boolean;
};

/** Toggle button for opening the listbox popup. */
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

export type RuiSelectValueProps = JsxElementProps<HTMLSpanElement>;

/**
 * Selected value display inside `RuiSelectTrigger`.
 *
 * @remarks When empty, shows the select `placeholder`. For the `options` API,
 * the view SSRs the resolved label (or placeholder) so the control height does
 * not collapse before client sync. For multi-select chip UI, provide
 * `RuiTagGroup` as children instead of relying on the default text.
 *
 * @cssclass rui-select__value - Selected value / placeholder text.
 */
export function RuiSelectValue({ children, slot, class: className, ...props }: RuiSelectValueProps) {
	return (
		<span {...props} slot={slot} data-select-value class={cx('rui-select__value', className)}>
			{children}
		</span>
	);
}

export type RuiSelectListboxProps = JsxElementProps<HTMLDivElement>;

/**
 * Popup shell slotted into `listbox`. Place an embedded `RuiListbox` inside.
 *
 * @cssclass rui-select__listbox - Popup shell; composes `rui-popover` surface roles.
 */
export function RuiSelectListbox({ children, slot = 'listbox', class: className, ...props }: RuiSelectListboxProps) {
	return (
		<div
			{...props}
			slot={slot}
			data-select-listbox
			class={cx('rui-select__listbox rui-popover rui-popover--listbox rui-floating', className)}
			hidden
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
 *
 * @cssclass rui-select__search - Filtering input inside the popup.
 */
export function RuiSelectSearch({
	placeholder,
	slot = 'input',
	class: className,
	disabled,
	...props
}: RuiSelectSearchProps) {
	return (
		<input
			{...props}
			type="search"
			slot={slot}
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
	value: unknown,
	placeholder: unknown,
): string {
	const selected = typeof value === 'string' ? value.trim() : '';
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
 * Select view. Pair with `RuiLabel` (sibling or via `RuiField`) for the visible name —
 * do not nest a select-specific label.
 */
export type RuiSelectViewProps = JsxCustomElementAttributes<
	RuiSelectElement,
	RuiSelectProps & {
		options?: RuiSelectOptionData[];
	}
>;

export function RuiSelect({ options, children, ...props }: RuiSelectViewProps) {
	const displayText = options != null ? resolveSelectDisplayText(options, props.value, props.placeholder) : '';
	const isPlaceholder =
		options != null && !(typeof props.value === 'string' && props.value.trim()) && Boolean(props.placeholder);

	return (
		<rui-select {...props}>
			{options == null ? (
				children
			) : (
				<>
					<RuiSelectControl>
						<RuiSelectTrigger>
							<RuiSelectValue {...(isPlaceholder ? { 'data-placeholder': true } : {})}>
								{displayText}
							</RuiSelectValue>
						</RuiSelectTrigger>
						<RuiSelectToggle />
					</RuiSelectControl>
					<RuiSelectListbox>
						<RuiListbox embedded options={options} />
					</RuiSelectListbox>
				</>
			)}
		</rui-select>
	);
}
