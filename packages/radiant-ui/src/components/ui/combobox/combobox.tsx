import type { JsxRenderable } from '@ecopages/jsx';
import type { RadiantSlotProps } from '../../../types';
import { defineRadiantView } from '../../../lib/radiant-view';
import type { RuiComboboxProps } from './combobox.script';
import { RuiCombobox as RuiComboboxElement } from './combobox.script';
import './combobox.css';

function cx(...parts: Array<string | false | null | undefined>): string {
	return parts.filter(Boolean).join(' ');
}

export type RuiComboboxControlProps = RadiantSlotProps & {
	children: JsxRenderable;
	class?: string;
};

/** Input row wrapper for the combobox input and optional trigger icon. */
export function RuiComboboxControl({ slot = 'control', children, class: className }: RuiComboboxControlProps) {
	return (
		<div slot={slot} class={cx('rui-combobox__control', className)}>
			{children}
		</div>
	);
}

export type RuiComboboxInputProps = {
	placeholder?: string;
	disabled?: boolean;
	class?: string;
};

/** Text input with `role="combobox"`. Place inside `RuiComboboxControl`. */
export function RuiComboboxInput({ placeholder, disabled, class: className }: RuiComboboxInputProps) {
	return (
		<input
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

export type RuiComboboxTriggerProps = {
	children?: JsxRenderable;
	class?: string;
	'aria-label'?: string;
	disabled?: boolean;
};

/** Optional open button placed inside `RuiComboboxControl`. */
export function RuiComboboxTrigger({
	children,
	class: className,
	'aria-label': ariaLabel = 'Show suggestions',
	disabled,
}: RuiComboboxTriggerProps) {
	return (
		<button
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

export type RuiComboboxListboxProps = RadiantSlotProps & {
	children: JsxRenderable;
	class?: string;
};

/** Popup listbox slotted into `listbox` by default. */
export function RuiComboboxListbox({ slot = 'listbox', children, class: className }: RuiComboboxListboxProps) {
	return (
		<div slot={slot} data-combobox-listbox class={cx('rui-combobox__listbox', className)} hidden>
			{children}
		</div>
	);
}

export type RuiComboboxOptionProps = {
	value: string;
	/** Display text committed to the input when selected. Defaults to `children` text. */
	label?: string;
	children: JsxRenderable;
	class?: string;
	disabled?: boolean;
};

/** Listbox option placed inside `RuiComboboxListbox`. */
export function RuiComboboxOption({ value, label, children, class: className, disabled }: RuiComboboxOptionProps) {
	return (
		<div
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
		slot,
		value,
		label,
		placeholder,
		disabled,
		openOnFocus,
		options,
		children,
	}: RuiComboboxProps &
		RadiantSlotProps & {
			options?: RuiComboboxOptionData[];
			children?: JsxRenderable;
		}) => {
		if (options != null) {
			return (
				<rui-combobox
					slot={slot}
					value={value}
					label={label}
					placeholder={placeholder}
					disabled={disabled}
					openOnFocus={openOnFocus}
				>
					<RuiComboboxControl>
						<RuiComboboxInput placeholder={placeholder} disabled={disabled} />
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

		return (
			<rui-combobox
				slot={slot}
				value={value}
				label={label}
				placeholder={placeholder}
				disabled={disabled}
				openOnFocus={openOnFocus}
			>
				{children}
			</rui-combobox>
		);
	},
);
