import type { JsxHtmlProps, JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiNumberFieldProps } from './number-field.script';
import { RuiNumberField as RuiNumberFieldElement } from './number-field.script';

export type RuiNumberFieldGroupProps = JsxHtmlPropsWithChildren<{
	slot?: string;
}>;

/** Input + stepper row. Place `RuiNumberFieldInput` and stepper buttons inside. */
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

export type RuiNumberFieldInputProps = JsxHtmlProps<{
	slot?: string;
	placeholder?: string;
	disabled?: boolean;
	readOnly?: boolean;
}>;

/** Text input in the `input` slot. Formatting is handled by `<rui-number-field>`. */
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

export type RuiNumberFieldSteppersProps = JsxHtmlPropsWithChildren<{
	slot?: string;
}>;

/** Groups increment and decrement steppers on the trailing edge of the field. */
export function RuiNumberFieldSteppers({ children, slot, class: className, ...props }: RuiNumberFieldSteppersProps) {
	return (
		<div {...props} slot={slot} class={cx('rui-number-field__steppers', className)}>
			{children}
		</div>
	);
}

export type RuiNumberFieldStepperButtonProps = JsxHtmlPropsWithChildren<{
	slot?: 'increment' | 'decrement';
	'aria-label'?: string;
	disabled?: boolean;
}>;

/** Increment stepper in the `increment` slot. */
export function RuiNumberFieldIncrementButton({
	children,
	slot = 'increment',
	class: className,
	'aria-label': ariaLabel = 'Increment',
	disabled,
	...props
}: RuiNumberFieldStepperButtonProps) {
	return (
		<button
			{...props}
			type="button"
			slot={slot}
			data-number-field-action="increment"
			class={cx('rui-number-field__stepper', className)}
			aria-label={ariaLabel}
			disabled={disabled}
			tabIndex={-1}
		>
			{children ?? '+'}
		</button>
	);
}

/** Decrement stepper in the `decrement` slot. */
export function RuiNumberFieldDecrementButton({
	children,
	slot = 'decrement',
	class: className,
	'aria-label': ariaLabel = 'Decrement',
	disabled,
	...props
}: RuiNumberFieldStepperButtonProps) {
	return (
		<button
			{...props}
			type="button"
			slot={slot}
			data-number-field-action="decrement"
			class={cx('rui-number-field__stepper', className)}
			aria-label={ariaLabel}
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
export const RuiNumberField = defineRadiantView(
	RuiNumberFieldElement,
	({ children, ...props }: JsxHtmlPropsWithChildren<RuiNumberFieldProps & { slot?: string }>) => (
		<rui-number-field {...props}>{children}</rui-number-field>
	),
	{ stylesheets: ['./number-field.css'] },
);
