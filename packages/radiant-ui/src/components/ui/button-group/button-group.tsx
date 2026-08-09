import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { cx } from '@/lib/cx';

export type RuiButtonGroupOrientation = 'horizontal' | 'vertical';

export type RuiButtonGroupProps = JsxHtmlPropsWithChildren<{
	/** Layout direction. Default: `horizontal`. */
	orientation?: RuiButtonGroupOrientation;
	/** Accessible name when the group has no visible label. */
	'aria-label'?: string;
}>;

/**
 * Related buttons / links in a horizontal or vertical group.
 *
 * @cssclass rui-button-group - Root group (`role="group"`).
 * @cssclass rui-button-group--horizontal - Side-by-side layout (default).
 * @cssclass rui-button-group--vertical - Stacked layout.
 */
export function RuiButtonGroup({
	children,
	orientation = 'horizontal',
	class: className,
	'aria-label': ariaLabel,
	...props
}: RuiButtonGroupProps) {
	return (
		<div
			{...props}
			role="group"
			aria-label={ariaLabel}
			aria-orientation={orientation}
			class={cx('rui-button-group', `rui-button-group--${orientation}`, className)}
		>
			{children}
		</div>
	);
}
