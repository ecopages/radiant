import type { JsxCustomElementAttributes, JsxElementProps } from '@ecopages/jsx';
import { withDefaultAriaLabel } from '@/lib/aria';
import { cx } from '@/lib/cx';
import { RuiIconMinus } from '@/lib/icons/minus';
import { RuiIconPlus } from '@/lib/icons/plus';
import type { NativeButtonProps, NativeInputProps } from '@/lib/native-element-props';
import { RuiNumberField as RuiNumberFieldElement, type RuiNumberFieldProps } from './number-field.script';

export type RuiNumberFieldGroupProps = JsxElementProps<HTMLDivElement>;

/**
 * Input + stepper row. Stamps `[data-number-field-group]` (presentation only).
 *
 * @cssclass rui-number-field__group - Control-height bordered row wrapping input and steppers.
 */
export function RuiNumberFieldGroup({ children, class: className, ...props }: RuiNumberFieldGroupProps) {
	return (
		<div {...props} data-number-field-group class={cx('rui-number-field__group', className)}>
			{children}
		</div>
	);
}

export type RuiNumberFieldInputProps = NativeInputProps & {
	placeholder?: string;
	disabled?: boolean;
	readOnly?: boolean;
};

/**
 * Stamps `[data-number-field-input]` as a number input. The host turns it into a locale text input when it connects.
 *
 * @remarks The host owns `readonly`: it mirrors its own `readOnly` onto the input, so set `readOnly` on the host.
 *
 * @cssclass rui-number-field__input - Borderless input inside the group.
 */
export function RuiNumberFieldInput({ class: className, disabled, readOnly, ...props }: RuiNumberFieldInputProps) {
	return (
		<input
			{...props}
			type="number"
			data-number-field-input
			data-rui-control
			data-rui-control-type="number"
			class={cx('rui-number-field__input', className)}
			disabled={disabled}
			readOnly={readOnly}
		/>
	);
}

export type RuiNumberFieldSteppersProps = JsxElementProps<HTMLDivElement>;

/**
 * Groups increment and decrement steppers on the trailing edge of the field.
 *
 * @cssclass rui-number-field__steppers - Trailing stepper column with a border divider.
 */
export function RuiNumberFieldSteppers({ children, class: className, ...props }: RuiNumberFieldSteppersProps) {
	return (
		<div {...props} class={cx('rui-number-field__steppers', className)}>
			{children}
		</div>
	);
}

export type RuiNumberFieldStepperButtonProps = NativeButtonProps & {
	disabled?: boolean;
};

/**
 * Increment stepper button. Stamps `[data-number-field-action="increment"]`.
 *
 * @cssclass rui-number-field__stepper - Icon button cell in the steppers column.
 */
export function RuiNumberFieldIncrementButton({
	children,
	class: className,
	aria,
	disabled,
	...props
}: RuiNumberFieldStepperButtonProps) {
	return (
		<button
			{...props}
			aria={withDefaultAriaLabel(aria, 'Increment')}
			type="button"
			data-number-field-action="increment"
			class={cx('rui-number-field__stepper', className)}
			disabled={disabled}
			tabIndex={-1}
		>
			{children ?? <RuiIconPlus />}
		</button>
	);
}

/**
 * Decrement stepper button. Stamps `[data-number-field-action="decrement"]`.
 *
 * @cssclass rui-number-field__stepper - Icon button cell in the steppers column.
 */
export function RuiNumberFieldDecrementButton({
	children,
	class: className,
	aria,
	disabled,
	...props
}: RuiNumberFieldStepperButtonProps) {
	return (
		<button
			{...props}
			aria={withDefaultAriaLabel(aria, 'Decrement')}
			type="button"
			data-number-field-action="decrement"
			class={cx('rui-number-field__stepper', className)}
			disabled={disabled}
			tabIndex={-1}
		>
			{children ?? <RuiIconMinus />}
		</button>
	);
}

function NumberFieldDefaultGroup() {
	return (
		<RuiNumberFieldGroup>
			<RuiNumberFieldInput />
			<RuiNumberFieldSteppers>
				<RuiNumberFieldDecrementButton />
				<RuiNumberFieldIncrementButton />
			</RuiNumberFieldSteppers>
		</RuiNumberFieldGroup>
	);
}

/**
 * Locale-aware number field. When `children` is omitted, renders the default group with
 * `[data-number-field-input]`, and stepper buttons.
 *
 * @cssclass rui-number-field - Root field wrapper (`data-ref="root"` is presentation only).
 */
export function RuiNumberField({
	children,
	...props
}: JsxCustomElementAttributes<RuiNumberFieldElement, RuiNumberFieldProps>) {
	return (
		<RuiNumberFieldElement {...props}>
			<div class="rui-number-field" data-ref="root">
				{children ?? <NumberFieldDefaultGroup />}
			</div>
		</RuiNumberFieldElement>
	);
}
