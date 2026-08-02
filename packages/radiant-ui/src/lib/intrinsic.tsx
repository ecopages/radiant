import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';

export type IntrinsicTag = keyof HTMLElementTagNameMap;

export type IntrinsicProps<Tag extends IntrinsicTag> = JsxHtmlPropsWithChildren<{
	as?: Tag;
}>;

/**
 * Renders a dynamic intrinsic element via JSX (`<Tag>`), avoiding per-tag switch blocks.
 *
 * @remarks Default tag is `div`; pass `as` on each call site.
 */
export function Intrinsic<Tag extends IntrinsicTag = 'div'>({
	as,
	children,
	...props
}: IntrinsicProps<Tag> & { as?: Tag }) {
	const Tag = (as ?? 'div') as Tag;

	return <Tag {...props}>{children}</Tag>;
}
