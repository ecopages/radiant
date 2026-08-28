import type { JsxCustomElementAttributes, JsxElementProps } from '@ecopages/jsx';
import { withDefaultAriaLabel } from '@/aria';
import { cx } from '@/lib/cx';
import type { RuiNumberField as RuiNumberFieldElement, RuiNumberFieldProps } from './number-field.script';
import './number-field.script';

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

export type RuiNumberFieldInputProps = JsxElementProps<HTMLInputElement> & {
	placeholder?: string;
	disabled?: boolean;
	readOnly?: boolean;
};

/**
 * Text input for the number field. Stamps `[data-number-field-input]`.
 * Formatting is handled by `<rui-number-field>`.
 *
 * @cssclass rui-number-field__input - Borderless text input inside the group.
 */
export function RuiNumberFieldInput({ class: className, disabled, readOnly, ...props }: RuiNumberFieldInputProps) {
	return (
		<input
			{...props}
			type="text"
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

export type RuiNumberFieldStepperButtonProps = JsxElementProps<HTMLButtonElement> & {
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
			{children ?? '+'}
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
			{children ?? '−'}
		</button>
	);
}

function NumberFieldDefaultGroup() {
	return (
		<RuiNumberFieldGroup>
			<RuiNumberFieldInput />
			<input type="hidden" data-number-field-value />
			<RuiNumberFieldSteppers>
				<RuiNumberFieldDecrementButton />
				<RuiNumberFieldIncrementButton />
			</RuiNumberFieldSteppers>
		</RuiNumberFieldGroup>
	);
}

/**
 * Locale-aware number field. When `children` is omitted, renders the default group with
 * `[data-number-field-input]`, `[data-number-field-value]`, and stepper buttons.
 *
 * @cssclass rui-number-field - Root field wrapper (`data-ref="root"` is presentation only).
 */
export function RuiNumberField({
	children,
	...props
}: JsxCustomElementAttributes<RuiNumberFieldElement, RuiNumberFieldProps>) {
	return (
		<rui-number-field {...props}>
			<div class="rui-number-field" data-ref="root">
				{children ?? <NumberFieldDefaultGroup />}
			</div>
		</rui-number-field>
	);
}
