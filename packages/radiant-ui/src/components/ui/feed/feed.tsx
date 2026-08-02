import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { attachRadiantStylesheets } from '@/lib/radiant-view';

export type RuiFeedProps = JsxHtmlPropsWithChildren<{
	/** Accessible name for the feed landmark. */
	label?: string;
	/** Prefer `label` when no visible heading labels the feed. */
	'aria-labelledby'?: string;
	/** Set while loading more articles (APG). */
	'aria-busy'?: boolean | 'true' | 'false';
}>;

/**
 * Presentational feed shell (`role="feed"`).
 *
 * @remarks No custom element — compose articles like a Card family. Consumers own
 * infinite scroll, keyboard navigation, and `aria-posinset` / `aria-setsize`.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/feed/
 */
export function RuiFeed({
	children,
	label,
	class: className,
	'aria-labelledby': ariaLabelledby,
	'aria-busy': ariaBusy,
	...props
}: RuiFeedProps) {
	return (
		<div
			{...props}
			role="feed"
			class={cx('rui-feed', className)}
			aria-label={label}
			aria-labelledby={ariaLabelledby}
			aria-busy={ariaBusy}
		>
			{children}
		</div>
	);
}

export type RuiFeedArticleProps = JsxHtmlPropsWithChildren<{
	/** Position in the feed (1-based). */
	posinset?: number;
	/** Total articles currently in the feed. */
	setsize?: number;
	/** Id(s) of the distinguishing label element(s). */
	labelledBy?: string;
	/** Id(s) of elements that summarize article content for skimming. */
	describedBy?: string;
	/** Make the article focusable (APG feed navigation). Default: `0`. */
	tabindex?: number | string;
}>;

/** Single feed article. */
export function RuiFeedArticle({
	children,
	posinset,
	setsize,
	labelledBy,
	describedBy,
	tabindex = 0,
	class: className,
	...props
}: RuiFeedArticleProps) {
	return (
		<article
			{...props}
			class={cx('rui-feed__article', className)}
			tabindex={tabindex}
			aria-posinset={posinset}
			aria-setsize={setsize}
			aria-labelledby={labelledBy}
			aria-describedby={describedBy}
		>
			{children}
		</article>
	);
}

export type RuiFeedArticleHeaderProps = JsxHtmlPropsWithChildren;

/** Article masthead — avatar, title, tags. */
export function RuiFeedArticleHeader({ children, class: className, ...props }: RuiFeedArticleHeaderProps) {
	return (
		<header {...props} class={cx('rui-feed__header', className)}>
			{children}
		</header>
	);
}

export type RuiFeedArticleContentProps = JsxHtmlPropsWithChildren<{
	id?: string;
}>;

/** Main article body. */
export function RuiFeedArticleContent({ children, class: className, ...props }: RuiFeedArticleContentProps) {
	return (
		<div {...props} class={cx('rui-feed__content', className)}>
			{children}
		</div>
	);
}

export type RuiFeedArticleActionsProps = JsxHtmlPropsWithChildren;

/** Action row (bookmark, share, etc.). */
export function RuiFeedArticleActions({ children, class: className, ...props }: RuiFeedArticleActionsProps) {
	return (
		<div {...props} class={cx('rui-feed__actions', className)}>
			{children}
		</div>
	);
}

export type RuiFeedBylineProps = JsxHtmlPropsWithChildren;

/** Avatar + stacked identity row inside an article header. */
export function RuiFeedByline({ children, class: className, ...props }: RuiFeedBylineProps) {
	return (
		<div {...props} class={cx('rui-feed__byline', className)}>
			{children}
		</div>
	);
}

export type RuiFeedBylineBodyProps = JsxHtmlPropsWithChildren;

/** Text stack beside an avatar in a byline. */
export function RuiFeedBylineBody({ children, class: className, ...props }: RuiFeedBylineBodyProps) {
	return (
		<div {...props} class={cx('rui-feed__byline-body', className)}>
			{children}
		</div>
	);
}

export type RuiFeedMetaProps = JsxHtmlPropsWithChildren<{
	id?: string;
}>;

/** Compact meta row (rating · neighborhood · price). */
export function RuiFeedMeta({ children, class: className, ...props }: RuiFeedMetaProps) {
	return (
		<div {...props} class={cx('rui-feed__meta', className)}>
			{children}
		</div>
	);
}

attachRadiantStylesheets(RuiFeed, ['./feed.css'], import.meta.url);
