import type { JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';

export type RuiBadgeVariant = 'filled' | 'outline' | 'destructive' | 'ghost' | 'muted';

export type RuiBadgeProps = JsxElementProps<HTMLSpanElement> & {
	/** Visual tone. Default: `filled`. */
	variant?: RuiBadgeVariant;
};

/**
 * Compact status or count label.
 *
 * @remarks For category chips and filter entities use `RuiChip` instead.
 *
 * @cssclass rui-badge - Badge root.
 * @cssclass rui-badge--filled - Primary emphasis on `primary-container`.
 * @cssclass rui-badge--outline - Bordered badge on `background`.
 * @cssclass rui-badge--destructive - Error emphasis.
 * @cssclass rui-badge--ghost - Subtle text-only badge.
 * @cssclass rui-badge--muted - Muted surface badge.
 */
export function RuiBadge({ children, variant = 'filled', class: className, ...props }: RuiBadgeProps) {
	return (
		<span {...props} class={cx('rui-badge', `rui-badge--${variant}`, className)}>
			{children}
		</span>
	);
}
