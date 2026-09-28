import type { JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';

export type RuiInputGroupProps = JsxElementProps<HTMLDivElement>;

/**
 * Bordered row that groups an input with leading or trailing addons.
 *
 * Place `RuiInput` and `RuiInputGroupAddon` children inside. `RuiField` still
 * discovers the nested `RuiInput` via `data-rui-control`.
 *
 * @cssclass rui-input-group - Control-height bordered row.
 */
export function RuiInputGroup({ children, class: className, ...props }: RuiInputGroupProps) {
	return (
		<div {...props} role="group" class={cx('rui-input-group', className)}>
			{children}
		</div>
	);
}

export type RuiInputGroupAddonAlign = 'start' | 'end';

export type RuiInputGroupAddonProps = JsxElementProps<HTMLDivElement> & {
	/** Inline edge for the addon. Default: `start`. */
	align?: RuiInputGroupAddonAlign;
};

/**
 * Leading or trailing slot for icons, text, or buttons inside an input group.
 *
 * @cssclass rui-input-group__addon - Addon cell.
 * @cssclass rui-input-group__addon--start - Leading addon (default).
 * @cssclass rui-input-group__addon--end - Trailing addon.
 */
export function RuiInputGroupAddon({ children, align = 'start', class: className, ...props }: RuiInputGroupAddonProps) {
	return (
		<div {...props} class={cx('rui-input-group__addon', `rui-input-group__addon--${align}`, className)}>
			{children}
		</div>
	);
}

export type RuiInputGroupTextProps = JsxElementProps<HTMLSpanElement>;

/**
 * Non-interactive prefix or suffix text inside an addon cell.
 *
 * @cssclass rui-input-group__text - Muted inline text in an addon.
 */
export function RuiInputGroupText({ children, class: className, ...props }: RuiInputGroupTextProps) {
	return (
		<span {...props} class={cx('rui-input-group__text', className)}>
			{children}
		</span>
	);
}
