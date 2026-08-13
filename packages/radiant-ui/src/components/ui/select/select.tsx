import type { JsxHtmlProps, JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { RuiIconChevronDown } from '@/lib/icons';
import { RuiListbox, RuiListboxOption, type RuiListboxOptionData } from '../listbox';
import type { RuiSelectProps } from './select.script';
import './select.script';

export type RuiSelectControlProps = JsxHtmlPropsWithChildren<{
	slot?: string;
}>;

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

export type RuiSelectTriggerProps = JsxHtmlPropsWithChildren<{
	disabled?: boolean;
	'aria-label'?: string;
}>;

/**
 * Value button with `role="combobox"`. Place `RuiSelectValue` inside.
 *
 * @cssclass rui-select__trigger - Value button; `role="combobox"` set by the controller.
 */
export function RuiSelectTrigger({ children, class: className, disabled, ...props }: RuiSelectTriggerProps) {
	return (
		<button
			{...props}
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

export type RuiSelectToggleProps = JsxHtmlPropsWithChildren<{
	'aria-label'?: string;
	disabled?: boolean;
}>;

/** Toggle button for opening the listbox popup. */
export function RuiSelectToggle({
	children,
	class: className,
	'aria-label': ariaLabel = 'Show options',
	disabled,
	...props
}: RuiSelectToggleProps) {
	return (
		<button
			{...props}
			type="button"
			data-select-toggle
			class={cx('rui-control-toggle', className)}
			aria-label={ariaLabel}
			disabled={disabled}
			tabIndex={-1}
		>
			{children ?? <RuiIconChevronDown />}
		</button>
	);
}

export type RuiSelectValueProps = JsxHtmlPropsWithChildren<{
	slot?: string;
}>;

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

export type RuiSelectListboxProps = JsxHtmlPropsWithChildren<{
	slot?: string;
}>;

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

export type RuiSelectSearchProps = JsxHtmlProps<{
	slot?: string;
	placeholder?: string;
	'aria-label'?: string;
	disabled?: boolean;
}>;

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

/** @deprecated Use `RuiListboxOption` */
export const RuiSelectOption = RuiListboxOption;

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
 *
 * @remarks
 * Reflected host fields use `attr:` so they survive plain nested SSR (for example
 * when this select is authored light DOM inside another custom element). Unprefixed
 * names bind as properties and are omitted from that serialization path.
 */
export function RuiSelect({
	options,
	children,
	value,
	label,
	placeholder,
	disabled,
	selectionMode,
	...props
}: JsxHtmlPropsWithChildren<
	RuiSelectProps & {
		slot?: string;
		options?: RuiSelectOptionData[];
	}
>) {
	const displayText = options != null ? resolveSelectDisplayText(options, value, placeholder) : '';
	const isPlaceholder = options != null && !(typeof value === 'string' && value.trim()) && Boolean(placeholder);

	return (
		<rui-select
			{...props}
			attr:value={value}
			attr:label={label}
			attr:placeholder={placeholder}
			attr:disabled={disabled}
			attr:selection-mode={selectionMode}
		>
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
