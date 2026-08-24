import type { JsxElementProps } from '@ecopages/jsx';
import { withDefaultAriaLabel } from '@/aria';
import { cx } from '@/lib/cx';

export type RuiSpinnerSize = 'sm' | 'md' | 'lg';

export type RuiSpinnerProps = JsxElementProps<HTMLSpanElement> & {
	/** Spinner diameter. Default: `md`. */
	size?: RuiSpinnerSize;
	/** Accessible label. Default: `Loading`. */
	aria?: { label?: string };
};

/**
 * Loading indicator for buttons, badges, and inline status.
 *
 * @cssclass rui-spinner - Spinner root (`role="status"`).
 * @cssclass rui-spinner--sm - Small spinner (`size-3`).
 * @cssclass rui-spinner--md - Medium spinner (`size-4`, default).
 * @cssclass rui-spinner--lg - Large spinner (`size-5`).
 */
export function RuiSpinner({ size = 'md', aria, class: className, ...props }: RuiSpinnerProps) {
	return (
		<span
			{...props}
			role="status"
			aria={withDefaultAriaLabel(aria, 'Loading')}
			class={cx('rui-spinner', `rui-spinner--${size}`, className)}
		/>
	);
}
