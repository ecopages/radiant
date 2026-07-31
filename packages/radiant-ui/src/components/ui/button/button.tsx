import type { JsxRenderable } from '@ecopages/jsx';
import type { RadiantSlotProps } from '@/types';

export type RuiButtonVariant = 'filled' | 'outline' | 'destructive' | 'ghost';
export type RuiButtonSize = 'sm' | 'md' | 'lg';

export type RuiButtonProps = RadiantSlotProps & {
	/** Visual style. Default: `filled`. */
	variant?: RuiButtonVariant;
	/** Control size. Default: `md`. */
	size?: RuiButtonSize;
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
	/** Extra class names appended after the variant/size classes. */
	class?: string;
	/** Accessible name when the button has no visible text. */
	'aria-label'?: string;
	'on:click'?: (event: Event) => void;
	children?: JsxRenderable;
};

function cx(...parts: Array<string | false | null | undefined>): string {
	return parts.filter(Boolean).join(' ');
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
 * Presentational wrapper around a native `<button>`.
 *
 * No custom element and no controller — only CSS variants/sizes. Follows the
 * APG Button pattern by staying on the native control for activation and focus.
 *
 * Styles ship via the radiant-ui base stylesheet (`rui-button` classes).
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/button/
 */
export function RuiButton({
	variant = 'filled',
	size = 'md',
	type = 'button',
	disabled,
	pressed,
	defaultPressed = false,
	toggle = false,
	class: className,
	slot,
	children,
	'on:click': onClick,
	...rest
}: RuiButtonProps) {
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
			class={cx('rui-button', `rui-button--${variant}`, `rui-button--${size}`, className)}
			disabled={disabled}
			aria-pressed={resolveAriaPressed(pressed, toggle, defaultPressed)}
			data-toggle={toggle && pressed === undefined ? '' : undefined}
			on:click={toggle || onClick ? handleClick : undefined}
			{...rest}
		>
			{children}
		</button>
	);
}
