import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { attachRadiantStylesheets } from '@/lib/radiant-view';

export type RuiButtonVariant = 'filled' | 'outline' | 'destructive' | 'ghost';
export type RuiButtonSize = 'sm' | 'md' | 'lg';

type RuiButtonCommonProps = JsxHtmlPropsWithChildren<{
	/** Visual style. Default: `filled`. */
	variant?: RuiButtonVariant;
	/** Control size. Default: `md` (Default in docs). */
	size?: RuiButtonSize;
	/** Accessible name when the button has no visible text. */
	'aria-label'?: string;
	/** Optional light-DOM slot when composing into a parent custom element. */
	slot?: string;
}>;

export type RuiButtonControlProps = RuiButtonCommonProps & {
	/** Native button type. Default: `button`. */
	type?: 'button' | 'submit' | 'reset';
	/** Disabled state. */
	disabled?: boolean;
	/** Controlled pressed state for toggle buttons (`aria-pressed`). */
	pressed?: boolean;
	/** Initial pressed state when `toggle` is used without a controlled `pressed` value. */
	defaultPressed?: boolean;
	/** Toggle `aria-pressed` on click when `pressed` is not controlled. */
	toggle?: boolean;
	href?: never;
	'on:click'?: (event: Event) => void;
};

export type RuiButtonLinkProps = RuiButtonCommonProps & {
	/** Destination for the button-styled link. */
	href: string;
	target?: '_self' | '_blank' | '_parent' | '_top';
	rel?: string;
	download?: boolean | string;
	'aria-current'?: string;
	'on:click'?: (event: Event) => void;
};

export type RuiButtonProps = RuiButtonControlProps | RuiButtonLinkProps;

function resolveAriaPressed(
	pressed: boolean | undefined,
	toggle: boolean,
	defaultPressed: boolean,
): boolean | undefined {
	if (pressed !== undefined) {
		return pressed;
	}

	if (toggle) {
		return defaultPressed;
	}

	return undefined;
}

/**
 * Presentational wrapper around a native `<button>` or button-styled `<a>`.
 *
 * No custom element and no controller — only CSS variants/sizes. The `href`
 * union branch preserves native link semantics for navigation.
 *
 * @remarks
 * Default/`md` height uses `--size-control-md`, the same token as `RuiInput`, so
 * form rows align. Styles live in `./button.css`.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/button/
 */
export function RuiButton(props: RuiButtonProps) {
	if (props.href !== undefined) {
		const {
			href,
			target,
			rel,
			download,
			'aria-label': ariaLabel,
			'aria-current': ariaCurrent,
			'on:click': onClick,
			children,
			class: className,
			variant,
			size,
			...host
		} = props;

		return (
			<a
				{...host}
				href={href}
				target={target}
				rel={rel}
				download={download}
				class={cx('rui-button', `rui-button--${variant ?? 'filled'}`, `rui-button--${size ?? 'md'}`, className)}
				aria-label={ariaLabel}
				aria-current={ariaCurrent}
				on:click={onClick}
			>
				{children}
			</a>
		);
	}

	const {
		variant,
		size,
		class: className,
		children,
		'aria-label': ariaLabel,
		type = 'button',
		disabled,
		pressed,
		defaultPressed = false,
		toggle = false,
		'on:click': onClick,
		...host
	} = props;
	const handleClick = (event: Event) => {
		if (toggle && pressed === undefined) {
			const button = event.currentTarget as HTMLButtonElement;
			const next = button.getAttribute('aria-pressed') !== 'true';
			button.setAttribute('aria-pressed', String(next));
		}

		onClick?.(event);
	};

	return (
		<button
			{...host}
			type={type}
			class={cx('rui-button', `rui-button--${variant ?? 'filled'}`, `rui-button--${size ?? 'md'}`, className)}
			disabled={disabled}
			aria-label={ariaLabel}
			aria-pressed={resolveAriaPressed(pressed, toggle, defaultPressed)}
			data-toggle={toggle && pressed === undefined ? '' : undefined}
			on:click={toggle || onClick ? handleClick : undefined}
		>
			{children}
		</button>
	);
}

attachRadiantStylesheets(RuiButton, ['./button.css'], import.meta.url);
