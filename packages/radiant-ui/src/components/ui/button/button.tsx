import type { JsxRenderable } from '@ecopages/jsx';
import type { RadiantSlotProps } from '@/types';

export type RuiButtonVariant = 'filled' | 'outline' | 'destructive' | 'ghost';
export type RuiButtonSize = 'sm' | 'md' | 'lg';

type RuiButtonCommonProps = RadiantSlotProps & {
	/** Visual style. Default: `filled`. */
	variant?: RuiButtonVariant;
	/** Control size. Default: `md`. */
	size?: RuiButtonSize;
	/** Extra class names appended after the variant/size classes. */
	class?: string;
	/** Accessible name when the button has no visible text. */
	'aria-label'?: string;
	/** Data attributes forwarded to the native control. */
	data?: Record<string, boolean | number | string | undefined>;
	children?: JsxRenderable;
};

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

function cx(...parts: Array<string | false | null | undefined>): string {
	return parts.filter(Boolean).join(' ');
}

function getClassNames({ variant = 'filled', size = 'md', class: className }: RuiButtonProps): string {
	return cx('rui-button', `rui-button--${variant}`, `rui-button--${size}`, className);
}

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
 * Styles ship via the radiant-ui base stylesheet (`rui-button` classes).
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/button/
 */
export function RuiButton(props: RuiButtonProps) {
	if (props.href !== undefined) {
		return (
			<a
				href={props.href}
				target={props.target}
				rel={props.rel}
				download={props.download}
				slot={props.slot}
				class={getClassNames(props)}
				aria-label={props['aria-label']}
				aria-current={props['aria-current']}
				data={props.data}
				on:click={props['on:click']}
			>
				{props.children}
			</a>
		);
	}

	const {
		variant,
		size,
		class: className,
		slot,
		children,
		'aria-label': ariaLabel,
		type = 'button',
		disabled,
		pressed,
		defaultPressed = false,
		toggle = false,
		'on:click': onClick,
		...rest
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
			type={type}
			slot={slot}
			class={cx('rui-button', `rui-button--${variant ?? 'filled'}`, `rui-button--${size ?? 'md'}`, className)}
			disabled={disabled}
			aria-label={ariaLabel}
			aria-pressed={resolveAriaPressed(pressed, toggle, defaultPressed)}
			data-toggle={toggle && pressed === undefined ? '' : undefined}
			on:click={toggle || onClick ? handleClick : undefined}
			{...rest}
		>
			{children}
		</button>
	);
}
