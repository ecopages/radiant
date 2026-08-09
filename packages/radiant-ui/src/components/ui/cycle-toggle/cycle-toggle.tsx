import type { JsxHtmlPropsWithChildren, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import type { RuiCycleToggleProps } from './cycle-toggle.script';
import './cycle-toggle.script';

export type RuiCycleToggleItemProps = {
	id: string;
	children: JsxRenderable;
	class?: string;
	disabled?: boolean;
	/** Whether this item is selected in the initial document. */
	selected?: boolean;
};

export type RuiCycleToggleButtonProps = JsxHtmlPropsWithChildren<
	Pick<RuiCycleToggleProps, 'disabled' | 'label' | 'size' | 'variant'>
>;

/**
 * One cycle option. Only the active item is visible inside the button.
 *
 * @cssclass rui-cycle-toggle__item - Cycle option row (icon + label).
 */
export function RuiCycleToggleItem({ id, children, class: className, disabled, selected }: RuiCycleToggleItemProps) {
	return (
		<span
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
 * Button chrome shared by cycle-toggle custom-element views.
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
}: RuiCycleToggleButtonProps) {
	return (
		<button
			type="button"
			class={cx('rui-button', 'rui-cycle-toggle__button', `rui-button--${variant}`, `rui-button--${size}`)}
			disabled={disabled}
			data-cycle-toggle-button
		>
			{children}
		</button>
	);
}

export function RuiCycleToggle({
	children,
	value,
	variant,
	size,
	label,
	disabled,
	...props
}: JsxHtmlPropsWithChildren<RuiCycleToggleProps & { slot?: string }>) {
	return (
		<rui-cycle-toggle {...props} value={value} variant={variant} size={size} label={label} disabled={disabled}>
			<RuiCycleToggleButton variant={variant} size={size} disabled={disabled}>
				{children}
			</RuiCycleToggleButton>
		</rui-cycle-toggle>
	);
}
