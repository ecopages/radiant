import type { JsxCustomElementAttributes, JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import type { RuiCycleToggle as RuiCycleToggleElement, RuiCycleToggleProps } from './cycle-toggle.script';
import './cycle-toggle.script';

export type RuiCycleToggleItemProps = Omit<JsxElementProps<HTMLSpanElement>, 'id'> & {
	id: string;
	disabled?: boolean;
	/** Whether this item is selected in the initial document. */
	selected?: boolean;
};

export type RuiCycleToggleButtonProps = JsxElementProps<HTMLButtonElement> &
	Pick<RuiCycleToggleProps, 'disabled' | 'label' | 'size' | 'variant'>;

/**
 * One cycle option inside the button. Stamps `[data-cycle-value]` from `id`.
 *
 * @cssclass rui-cycle-toggle__item - Cycle option row (icon + label).
 */
export function RuiCycleToggleItem({
	id,
	children,
	class: className,
	disabled,
	selected,
	...props
}: RuiCycleToggleItemProps) {
	return (
		<span
			{...props}
			class={cx('rui-cycle-toggle__item', className)}
			data-cycle-value={id}
			hidden={selected === undefined ? undefined : !selected}
			aria-disabled={disabled ? 'true' : undefined}
		>
			{children}
		</span>
	);
}

/**
 * Button chrome for cycle-toggle views. Stamps `button[data-cycle-toggle-button]`.
 *
 * Composes `rui-button` with `rui-button--<variant> --<size>` (see button).
 *
 * @cssclass rui-cycle-toggle__button - Cycle toggle button root.
 */
export function RuiCycleToggleButton({
	children,
	variant = 'filled',
	size = 'md',
	disabled,
	class: className,
	...props
}: RuiCycleToggleButtonProps) {
	return (
		<button
			{...props}
			type="button"
			class={cx(
				'rui-button',
				'rui-cycle-toggle__button',
				`rui-button--${variant}`,
				`rui-button--${size}`,
				className,
			)}
			disabled={disabled}
			data-cycle-toggle-button
		>
			{children}
		</button>
	);
}

/**
 * Cycle toggle view. Stamps `<rui-cycle-toggle>` and `RuiCycleToggleButton`
 * (`button[data-cycle-toggle-button]`) wrapping `RuiCycleToggleItem` children.
 */
export function RuiCycleToggle({
	children,
	variant,
	size,
	disabled,
	...props
}: JsxCustomElementAttributes<RuiCycleToggleElement, RuiCycleToggleProps>) {
	return (
		<rui-cycle-toggle {...props} variant={variant} size={size} disabled={disabled}>
			<RuiCycleToggleButton variant={variant} size={size} disabled={disabled}>
				{children}
			</RuiCycleToggleButton>
		</rui-cycle-toggle>
	);
}
