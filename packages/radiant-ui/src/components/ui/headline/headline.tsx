import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { Intrinsic, type IntrinsicTag } from '@/lib/intrinsic';

export type RuiHeadlineSize = 'sm' | 'md' | 'lg' | 'xl';
export type RuiHeadlineAs = Extract<IntrinsicTag, 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span'>;

export type RuiHeadlineProps = JsxHtmlPropsWithChildren<{
	/** Semantic element. Default: `h2`. */
	as?: RuiHeadlineAs;
	/**
	 * Type scale. Default: `md`.
	 * Pass `false` when a parent (e.g. `RuiHeading`) owns size via CSS variables.
	 */
	size?: RuiHeadlineSize | false;
	id?: string;
}>;

/** Standalone display title outside a heading block. */
export function RuiHeadline({ children, as = 'h2', size = 'md', class: className, ...props }: RuiHeadlineProps) {
	return (
		<Intrinsic
			as={as}
			{...props}
			class={cx('rui-headline', size !== false && `rui-headline--size-${size}`, className)}
		>
			{children}
		</Intrinsic>
	);
}
