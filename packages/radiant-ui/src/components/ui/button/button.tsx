import type { JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';

export type RuiButtonVariant = 'filled' | 'outline' | 'destructive' | 'ghost' | 'link';
export type RuiButtonSize = 'none' | 'sm' | 'md' | 'lg';

type RuiButtonChrome = {
	/** Visual style. Default: `filled`. */
	variant?: RuiButtonVariant;
	/** Control size. Default: `md` (Default in docs). Use `none` for inline `link` chrome. */
	size?: RuiButtonSize;
	/** Makes a control-sized button square, for example for an icon-only action. */
	square?: boolean;
};

export type RuiButtonControlProps = JsxElementProps<HTMLButtonElement> &
	RuiButtonChrome & {
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
	};

export type RuiButtonLinkProps = JsxElementProps<HTMLAnchorElement> &
	RuiButtonChrome & {
		/** Destination for the button-styled link. */
		href: string;
		target?: '_self' | '_blank' | '_parent' | '_top';
		rel?: string;
		download?: boolean | string;
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

function invokeClickListener(listener: unknown, event: Event) {
	if (typeof listener === 'function') {
		(listener as (event: Event) => void)(event);
		return;
	}

	if (listener != null && typeof listener === 'object' && 'handleEvent' in listener) {
		(listener as { handleEvent(event: Event): void }).handleEvent(event);
	}
}

/**
 * Presentational wrapper around a native `<button>` or button-styled `<a>`.
 *
 * No custom element and no controller — only CSS variants/sizes. The `href`
 * union branch preserves native link semantics for navigation.
 *
 * @remarks
 * Default/`md` height uses `--size-control-md`, the same token as `RuiInput`, so
 * form rows align. `none` omits fixed height and padding for inline `link`
 * actions. `square` makes the selected control size equal on both axes, making
 * it suitable for icon-only actions. Styles live in `./button.css`.
 *
 * Variant tones map to semantic action roles — `primary` for filled, `error`
 * (destructive) for destructive — never palette steps.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/button/
 *
 * @cssclass rui-button - Button / button-styled link root.
 * @cssclass rui-button--filled - Primary filled action (`bg-primary`).
 * @cssclass rui-button--outline - Bordered secondary action.
 * @cssclass rui-button--destructive - Destructive action (`bg-error`).
 * @cssclass rui-button--ghost - Subtle, borderless action.
 * @cssclass rui-button--link - Inline link-styled action.
 * @cssclass rui-button--none - No fixed size (inline `link` chrome).
 * @cssclass rui-button--sm - Small control height.
 * @cssclass rui-button--md - Default control height.
 * @cssclass rui-button--lg - Large control height.
 * @cssclass rui-button--square - Square control for icon-only actions.
 */
export function RuiButton(props: RuiButtonProps) {
	if (props.href !== undefined) {
		const { href, target, rel, download, children, class: className, variant, size, square, ...host } = props;

		return (
			<a
				{...host}
				href={href}
				target={target}
				rel={rel}
				download={download}
				class={cx('rui-button', `rui-button--${variant ?? 'filled'}`, `rui-button--${size ?? 'md'}`, square && 'rui-button--square', className)}
			>
				{children}
			</a>
		);
	}

	const {
		variant,
		size,
		square,
		class: className,
		children,
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

		invokeClickListener(onClick, event);
	};

	return (
		<button
			{...host}
			type={type}
			class={cx('rui-button', `rui-button--${variant ?? 'filled'}`, `rui-button--${size ?? 'md'}`, square && 'rui-button--square', className)}
			disabled={disabled}
			aria-pressed={resolveAriaPressed(pressed, toggle, defaultPressed)}
			data-toggle={toggle && pressed === undefined ? '' : undefined}
			on:click={toggle || onClick ? handleClick : undefined}
		>
			{children}
		</button>
	);
}
