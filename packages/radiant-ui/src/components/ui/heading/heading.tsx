import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { Intrinsic, type IntrinsicTag } from '@/lib/intrinsic';
import { RuiHeadline, type RuiHeadlineAs } from '../headline/headline';

export type RuiHeadingAlign = 'start' | 'center';
export type RuiHeadingSize = 'sm' | 'md' | 'lg' | 'xl';
export type RuiHeadingRootAs = Extract<IntrinsicTag, 'div' | 'header' | 'section' | 'article' | 'aside'>;
export type RuiHeadingTitleAs = RuiHeadlineAs;

export type RuiHeadingProps = JsxHtmlPropsWithChildren<{
	/** Root element. Default: `div`. */
	as?: RuiHeadingRootAs;
	/** Text and flex alignment. Default: `start`. */
	align?: RuiHeadingAlign;
	/** Type scale and vertical rhythm between slots. Default: `md`. */
	size?: RuiHeadingSize;
}>;

function headingRootClassName(align: RuiHeadingAlign, size: RuiHeadingSize, className?: string) {
	return cx('rui-heading', `rui-heading--align-${align}`, `rui-heading--size-${size}`, className);
}

/** Groups eyebrow, title, and description with shared spacing and type scale. */
export function RuiHeading({
	children,
	as = 'div',
	align = 'start',
	size = 'md',
	class: className,
	...props
}: RuiHeadingProps) {
	return (
		<Intrinsic as={as} {...props} class={headingRootClassName(align, size, className)}>
			{children}
		</Intrinsic>
	);
}

export type RuiHeadingEyebrowProps = JsxHtmlPropsWithChildren;

/** Kicker line above the title. */
export function RuiHeadingEyebrow({ children, class: className, ...props }: RuiHeadingEyebrowProps) {
	return (
		<p {...props} class={cx('rui-heading__eyebrow', className)}>
			{children}
		</p>
	);
}

export type RuiHeadingTitleProps = JsxHtmlPropsWithChildren<{
	/** Heading level. Default: `h2`. */
	as?: RuiHeadingTitleAs;
	id?: string;
}>;

/** Main title within a heading block — `RuiHeadline` sized by the parent `RuiHeading`. */
export function RuiHeadingTitle({ children, as = 'h2', class: className, ...props }: RuiHeadingTitleProps) {
	return (
		<RuiHeadline as={as} size={false} class={cx('rui-heading__title', className)} {...props}>
			{children}
		</RuiHeadline>
	);
}

export type RuiHeadingDescriptionProps = JsxHtmlPropsWithChildren;

/** Supporting copy below the title. */
export function RuiHeadingDescription({ children, class: className, ...props }: RuiHeadingDescriptionProps) {
	return (
		<p {...props} class={cx('rui-heading__description', className)}>
			{children}
		</p>
	);
}
