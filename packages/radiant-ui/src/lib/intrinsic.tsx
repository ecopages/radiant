import type { JsxElementProps } from '@ecopages/jsx';

export type IntrinsicTag = keyof HTMLElementTagNameMap;

export type IntrinsicProps<Tag extends IntrinsicTag> = JsxElementProps<HTMLElementTagNameMap[Tag]> & { as?: Tag };

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
	const DynamicTag = Tag as unknown as 'div';

	return <DynamicTag {...(props as JsxElementProps<HTMLDivElement>)}>{children}</DynamicTag>;
}
