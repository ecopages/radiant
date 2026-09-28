import type { JsxElementProps } from '@ecopages/jsx';
import { withDefaultAriaLabel } from '@/aria';
import { coalesceDefined } from '@/lib/coalesce-defined';
import { cx } from '@/lib/cx';

export type RuiFeedProps = JsxElementProps<HTMLDivElement> & {
	/** Accessible name for the feed landmark. */
	label?: string;
};

/**
 * Presentational feed shell (`role="feed"`).
 *
 * @cssclass rui-feed - Feed region (`role="feed"`).
 *
 * @remarks No custom element — compose articles like a Card family. Consumers own
 * infinite scroll, keyboard navigation, and `aria-posinset` / `aria-setsize`.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/feed/
 */
export function RuiFeed({ children, label, class: className, aria, ...props }: RuiFeedProps) {
	return (
		<div {...props} aria={withDefaultAriaLabel(aria, label)} role="feed" class={cx('rui-feed', className)}>
			{children}
		</div>
	);
}

export type RuiFeedArticleProps = JsxElementProps<HTMLElement> & {
	/** Position in the feed (1-based). */
	posinset?: number;
	/** Total articles currently in the feed. */
	setsize?: number;
	/** Id(s) of the distinguishing label element(s). */
	labelledBy?: string;
	/** Id(s) of elements that summarize article content for skimming. */
	describedBy?: string;
};

/**
 * Single feed article.
 *
 * @cssclass rui-feed__article - Article card surface.
 */
export function RuiFeedArticle({
	children,
	posinset,
	setsize,
	labelledBy,
	describedBy,
	tabindex = 0,
	class: className,
	'aria-posinset': ariaPosinset,
	'aria-setsize': ariaSetsize,
	'aria-labelledby': ariaLabelledby,
	'aria-describedby': ariaDescribedby,
	...props
}: RuiFeedArticleProps) {
	return (
		<article
			{...props}
			class={cx('rui-feed__article', className)}
			tabindex={tabindex}
			aria-posinset={coalesceDefined(ariaPosinset, posinset)}
			aria-setsize={coalesceDefined(ariaSetsize, setsize)}
			aria-labelledby={coalesceDefined(ariaLabelledby, labelledBy)}
			aria-describedby={coalesceDefined(ariaDescribedby, describedBy)}
		>
			{children}
		</article>
	);
}

export type RuiFeedArticleHeaderProps = JsxElementProps<HTMLElement>;

/**
 * Article masthead — avatar, title, tags.
 *
 * @cssclass rui-feed__header - Article header stack.
 */
export function RuiFeedArticleHeader({ children, class: className, ...props }: RuiFeedArticleHeaderProps) {
	return (
		<header {...props} class={cx('rui-feed__header', className)}>
			{children}
		</header>
	);
}

export type RuiFeedArticleContentProps = JsxElementProps<HTMLDivElement>;

/**
 * Main article body.
 *
 * @cssclass rui-feed__content - Article body column.
 */
export function RuiFeedArticleContent({ children, class: className, ...props }: RuiFeedArticleContentProps) {
	return (
		<div {...props} class={cx('rui-feed__content', className)}>
			{children}
		</div>
	);
}

export type RuiFeedArticleActionsProps = JsxElementProps<HTMLDivElement>;

/**
 * Action row (bookmark, share, etc.).
 *
 * @cssclass rui-feed__actions - Action row under a top border.
 */
export function RuiFeedArticleActions({ children, class: className, ...props }: RuiFeedArticleActionsProps) {
	return (
		<div {...props} class={cx('rui-feed__actions', className)}>
			{children}
		</div>
	);
}

export type RuiFeedBylineProps = JsxElementProps<HTMLDivElement>;

/**
 * Avatar + stacked identity row inside an article header.
 *
 * @cssclass rui-feed__byline - Avatar and identity row.
 */
export function RuiFeedByline({ children, class: className, ...props }: RuiFeedBylineProps) {
	return (
		<div {...props} class={cx('rui-feed__byline', className)}>
			{children}
		</div>
	);
}

export type RuiFeedBylineBodyProps = JsxElementProps<HTMLDivElement>;

/**
 * Text stack beside an avatar in a byline.
 *
 * @cssclass rui-feed__byline-body - Identity text stack.
 */
export function RuiFeedBylineBody({ children, class: className, ...props }: RuiFeedBylineBodyProps) {
	return (
		<div {...props} class={cx('rui-feed__byline-body', className)}>
			{children}
		</div>
	);
}

export type RuiFeedMetaProps = JsxElementProps<HTMLDivElement>;

/**
 * Compact meta row (rating · neighborhood · price).
 *
 * @cssclass rui-feed__meta - Metadata row.
 */
export function RuiFeedMeta({ children, class: className, ...props }: RuiFeedMetaProps) {
	return (
		<div {...props} class={cx('rui-feed__meta', className)}>
			{children}
		</div>
	);
}
