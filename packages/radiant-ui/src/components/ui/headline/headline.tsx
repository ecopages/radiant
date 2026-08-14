import type { JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { Intrinsic, type IntrinsicProps, type IntrinsicTag } from '@/lib/intrinsic';

export type RuiHeadlineSize = 'sm' | 'md' | 'lg' | 'xl';
export type RuiHeadlineAs = Extract<IntrinsicTag, 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span'>;

export type RuiHeadlineProps<Tag extends RuiHeadlineAs = 'h2'> = Omit<IntrinsicProps<Tag>, 'as'> & {
	/** Semantic element. Default: `h2`. */
	as?: Tag;
	/**
	 * Type scale. Default: `md`.
	 * Pass `false` when a parent (e.g. `RuiHeading`) owns size via CSS variables.
	 */
	size?: RuiHeadlineSize | false;
	children?: JsxRenderable;
};

/**
 * Standalone display title outside a heading block.
 *
 * @cssclass rui-headline - Display title root.
 * @cssclass rui-headline--size-sm - Small type scale.
 * @cssclass rui-headline--size-md - Default type scale.
 * @cssclass rui-headline--size-lg - Large type scale.
 * @cssclass rui-headline--size-xl - XLarge type scale.
 */
export function RuiHeadline<Tag extends RuiHeadlineAs = 'h2'>(props: RuiHeadlineProps<Tag>) {
	const { children, as = 'h2', size = 'md', class: className, ...host } = props as RuiHeadlineProps<RuiHeadlineAs>;

	return (
		<Intrinsic
			as={as}
			{...host}
			class={cx('rui-headline', size !== false && `rui-headline--size-${size}`, className)}
		>
			{children}
		</Intrinsic>
	);
}
