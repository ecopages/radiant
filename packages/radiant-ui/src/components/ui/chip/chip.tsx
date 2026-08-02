import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { attachRadiantStylesheets } from '@/lib/radiant-view';

export type RuiChipVariant = 'default' | 'muted' | 'primary';

export type RuiChipProps = JsxHtmlPropsWithChildren<{
	variant?: RuiChipVariant;
}>;

/**
 * Presentational category chip.
 *
 * @remarks For removable / selectable tags use `RuiTagGroup` instead.
 */
export function RuiChip({ children, variant = 'default', class: className, ...props }: RuiChipProps) {
	return (
		<span {...props} class={cx('rui-chip', `rui-chip--${variant}`, className)}>
			{children}
		</span>
	);
}

attachRadiantStylesheets(RuiChip, ['./chip.css'], import.meta.url);
