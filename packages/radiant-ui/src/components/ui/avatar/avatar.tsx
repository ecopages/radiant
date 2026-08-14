import type { JsxElementProps } from '@ecopages/jsx';
import { withDefaultAriaLabel } from '@/aria';
import { coalesceDefined } from '@/lib/coalesce-defined';
import { cx } from '@/lib/cx';

export type RuiAvatarSize = 'sm' | 'md' | 'lg';

export type RuiAvatarProps = JsxElementProps<HTMLSpanElement> & {
	/** Image URL. When omitted or broken, initials from `alt` / `fallback` are shown. */
	src?: string;
	/** Accessible name for the image. Also used to derive initials when `fallback` is omitted. */
	alt?: string;
	/** Explicit fallback initials / text when there is no image. */
	fallback?: string;
	size?: RuiAvatarSize;
};

function initialsFrom(label: string): string {
	const parts = label.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return '?';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

/**
 * Image avatar with initials fallback.
 *
 * @remarks When `src` is omitted or fails to load, initials derived from `alt`
 * (or the explicit `fallback`) are shown in a `role="img"` span. There is no
 * runtime image-error listener — pass `fallback` for reliable SSR of the
 * fallback state.
 *
 * @cssclass rui-avatar - Avatar root; `role="img"` when image-less.
 * @cssclass rui-avatar--sm - Small size.
 * @cssclass rui-avatar--md - Default size.
 * @cssclass rui-avatar--lg - Large size.
 * @cssclass rui-avatar__image - `<img>` fill.
 * @cssclass rui-avatar__fallback - Initials / text fallback.
 */
export function RuiAvatar({
	src,
	alt = '',
	fallback,
	size = 'md',
	class: className,
	children,
	role,
	aria,
	...props
}: RuiAvatarProps) {
	const label = fallback ?? (alt ? initialsFrom(alt) : undefined);

	return (
		<span
			{...props}
			aria={withDefaultAriaLabel(aria, src ? undefined : alt || fallback)}
			class={cx('rui-avatar', `rui-avatar--${size}`, className)}
			role={coalesceDefined(role, src ? undefined : 'img')}
		>
			{src ? (
				<img class="rui-avatar__image" src={src} alt={alt} />
			) : (
				<span class="rui-avatar__fallback" aria-hidden={alt || fallback ? 'true' : undefined}>
					{children ?? label ?? '?'}
				</span>
			)}
		</span>
	);
}
