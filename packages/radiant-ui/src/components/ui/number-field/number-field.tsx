import type { JsxCustomElementAttributes, JsxElementProps } from '@ecopages/jsx';
import { withDefaultAriaLabel } from '@/aria';
import { cx } from '@/lib/cx';
import type { RuiNumberField as RuiNumberFieldElement, RuiNumberFieldProps } from './number-field.script';
import './number-field.script';

export type RuiNumberFieldGroupProps = JsxElementProps<HTMLDivElement>;

/**
 * Input + stepper row. Place `RuiNumberFieldInput` and stepper buttons inside.
 *
 * @cssclass rui-number-field__group - Control-height bordered row wrapping input and steppers.
 */
export function RuiNumberFieldGroup({
	children,
	slot = 'group',
	class: className,
	...props
}: RuiNumberFieldGroupProps) {
	return (
		<div {...props} slot={slot} data-number-field-group class={cx('rui-number-field__group', className)}>
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
 * Text input in the `input` slot. Formatting is handled by `<rui-number-field>`.
 *
 * @cssclass rui-number-field__input - Borderless text input inside the group.
 */
export function RuiNumberFieldInput({
	slot = 'input',
	class: className,
	disabled,
	readOnly,
	...props
}: RuiNumberFieldInputProps) {
	return (
		<input
			{...props}
			type="text"
			slot={slot}
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
export function RuiNumberFieldSteppers({ children, slot, class: className, ...props }: RuiNumberFieldSteppersProps) {
	return (
		<div {...props} slot={slot} class={cx('rui-number-field__steppers', className)}>
			{children}
		</div>
	);
}

export type RuiNumberFieldStepperButtonProps = JsxElementProps<HTMLButtonElement> & {
	slot?: 'increment' | 'decrement';
	disabled?: boolean;
};

/**
 * Increment stepper in the `increment` slot.
 *
 * @cssclass rui-number-field__stepper - Icon button cell in the steppers column.
 */
export function RuiNumberFieldIncrementButton({
	children,
	slot = 'increment',
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
			slot={slot}
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
 * Decrement stepper in the `decrement` slot.
 *
 * @cssclass rui-number-field__stepper - Icon button cell in the steppers column.
 */
export function RuiNumberFieldDecrementButton({
	children,
	slot = 'decrement',
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
			slot={slot}
			data-number-field-action="decrement"
			class={cx('rui-number-field__stepper', className)}
			disabled={disabled}
			tabIndex={-1}
		>
			{children ?? '−'}
		</button>
	);
}

/**
 * Locale-aware number field — React Aria-style API.
 *
 * ```tsx
 * <RuiNumberField value={25} minValue={0} maxValue={100}>
 *   <RuiNumberFieldGroup>
 *     <RuiNumberFieldInput />
 *     <RuiNumberFieldSteppers>
 *       <RuiNumberFieldDecrementButton />
 *       <RuiNumberFieldIncrementButton />
 *     </RuiNumberFieldSteppers>
 *   </RuiNumberFieldGroup>
 * </RuiNumberField>
 * ```
 *
 * Or use standalone; default slots render input and stepper buttons.
 * Pair with `RuiLabel` / `RuiField` for labeling and validation.
 */
export function RuiNumberField({
	children,
	...props
}: JsxCustomElementAttributes<RuiNumberFieldElement, RuiNumberFieldProps>) {
	return <rui-number-field {...props}>{children}</rui-number-field>;
}
