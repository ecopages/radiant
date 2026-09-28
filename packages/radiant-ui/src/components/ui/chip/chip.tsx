import type { JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';

export type RuiChipVariant = 'default' | 'muted' | 'primary';

export type RuiChipProps = JsxElementProps<HTMLSpanElement> & {
	variant?: RuiChipVariant;
};

/**
 * Presentational category chip.
 *
 * @remarks For removable / selectable tags use `RuiTagGroup` instead.
 *
 * Variant tones map to semantic surfaces — `primary` uses the `primary-container`
 * family, never a palette step. Styles live in `./chip.css`.
 *
 * @cssclass rui-chip - Chip root.
 * @cssclass rui-chip--default - Bordered chip on `surface-container-low`.
 * @cssclass rui-chip--muted - Chip on `surface-container` without a border.
 * @cssclass rui-chip--primary - Emphasized chip on `primary-container`.
 */
export function RuiChip({ children, variant = 'default', class: className, ...props }: RuiChipProps) {
	return (
		<span {...props} class={cx('rui-chip', `rui-chip--${variant}`, className)}>
			{children}
		</span>
	);
}
