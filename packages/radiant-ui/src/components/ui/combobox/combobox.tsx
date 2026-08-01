import type { JsxHtmlProps, JsxHtmlPropsWithChildren, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiComboboxProps } from './combobox.script';
import { RuiCombobox as RuiComboboxElement } from './combobox.script';

export type RuiComboboxControlProps = JsxHtmlPropsWithChildren<{
	slot?: string;
}>;

/** Input row wrapper for the combobox input and optional trigger icon. */
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

/** Optional open button placed inside `RuiComboboxControl`. */
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
			class={cx('rui-combobox__trigger', className)}
			aria-label={ariaLabel}
			disabled={disabled}
			tabIndex={-1}
		>
			{children ?? <span aria-hidden="true">▾</span>}
		</button>
	);
}

export type RuiComboboxListboxProps = JsxHtmlPropsWithChildren<{
	slot?: string;
}>;

/** Popup listbox slotted into `listbox` by default. */
export function RuiComboboxListbox({
	children,
	slot = 'listbox',
	class: className,
	...props
}: RuiComboboxListboxProps) {
	return (
		<div {...props} slot={slot} data-combobox-listbox class={cx('rui-combobox__listbox', className)} hidden>
			{children}
		</div>
	);
}

export type RuiComboboxOptionProps = JsxHtmlPropsWithChildren<{
	value: string;
	/** Display text committed to the input when selected. Defaults to `children` text. */
	label?: string;
	disabled?: boolean;
}>;

/** Listbox option placed inside `RuiComboboxListbox`. */
export function RuiComboboxOption({
	value,
	label,
	children,
	class: className,
	disabled,
	...props
}: RuiComboboxOptionProps) {
	return (
		<div
			{...props}
			role="option"
			data-combobox-option
			data-value={value}
			data-label={label}
			class={cx('rui-combobox__option', className)}
			aria-disabled={disabled ? 'true' : undefined}
		>
			{children}
		</div>
	);
}

export type RuiComboboxOptionData = { value: string; label: JsxRenderable };

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
						{options.map((option) => (
							<RuiComboboxOption
								value={option.value}
								label={typeof option.label === 'string' ? option.label : undefined}
							>
								{option.label}
							</RuiComboboxOption>
						))}
					</RuiComboboxListbox>
				</rui-combobox>
			);
		}

		return <rui-combobox {...props}>{children}</rui-combobox>;
	},
	{ stylesheets: ['./combobox.css'] },
);
