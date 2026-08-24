import type { JsxCustomElementAttributes, JsxElementProps, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import type {
	RuiDisclosureGroup as RuiDisclosureGroupElement,
	RuiDisclosureGroupProps,
} from './disclosure-group.script';
import './disclosure-group.script';

import type { RuiDisclosure as RuiDisclosureElement, RuiDisclosureProps } from './disclosure.script';
import './disclosure.script';

export type RuiDisclosureIconProps = JsxElementProps<HTMLSpanElement> & {
	variant?: 'chevron' | 'plus';
};

/**
 * Default disclosure indicator. Override via `RuiDisclosureTrigger` `icon` prop.
 *
 * @cssclass rui-disclosure__icon - Indicator wrapper (decorative, `aria-hidden`).
 * @cssclass rui-disclosure__icon--chevron - Rotates 90° when the disclosure is open.
 * @cssclass rui-disclosure__icon--plus - Toggles between `+` and `×`.
 */
export function RuiDisclosureIcon({ variant = 'chevron', class: className, ...props }: RuiDisclosureIconProps) {
	return (
		<span
			{...props}
			class={cx('rui-disclosure__icon', `rui-disclosure__icon--${variant}`, className)}
			data-disclosure-icon
			aria-hidden="true"
		></span>
	);
}

export type RuiDisclosureTriggerProps = JsxElementProps<HTMLButtonElement> & {
	disabled?: boolean;
	/** Custom indicator. Pass `null` to hide. Defaults to chevron. */
	icon?: JsxRenderable | null;
	iconPosition?: 'start' | 'end';
};

/**
 * Disclosure trigger button. Place before `RuiDisclosurePanel`.
 *
 * @cssclass rui-disclosure__trigger - Trigger button; reflects `aria-expanded`.
 * @cssclass rui-disclosure__trigger--icon-end - Layout when `iconPosition="end"`.
 * @cssclass rui-disclosure__label - Trigger text.
 */
export function RuiDisclosureTrigger({
	children,
	class: className,
	disabled,
	icon,
	iconPosition = 'start',
	...props
}: RuiDisclosureTriggerProps) {
	const showIcon = icon !== null;
	const iconNode = showIcon ? (icon ?? <RuiDisclosureIcon />) : null;

	return (
		<button
			{...props}
			type="button"
			data-disclosure-trigger
			class={cx(
				'rui-disclosure__trigger',
				iconPosition === 'end' && 'rui-disclosure__trigger--icon-end',
				className,
			)}
			disabled={disabled}
		>
			{iconPosition === 'start' ? iconNode : null}
			<span class="rui-disclosure__label">{children}</span>
			{iconPosition === 'end' ? iconNode : null}
		</button>
	);
}

export type RuiDisclosurePanelProps = JsxElementProps<HTMLDivElement>;

/**
 * Disclosure panel content. Place after `RuiDisclosureTrigger`.
 *
 * @cssclass rui-disclosure__panel - Panel content region.
 * @cssclass rui-disclosure__panel-inner - Panel padding wrapper (drives the height animation).
 */
export function RuiDisclosurePanel({ children, class: className, ...props }: RuiDisclosurePanelProps) {
	return (
		<div {...props} data-disclosure-panel data-ref="panel" class={cx('rui-disclosure__panel', className)}>
			<div class="rui-disclosure__panel-inner">{children}</div>
		</div>
	);
}

function DisclosureShell({ children }: { children: JsxRenderable }) {
	return (
		<div class="rui-disclosure" data-ref="root">
			{children}
		</div>
	);
}

export function RuiDisclosure({
	trigger,
	children,
	...props
}: JsxCustomElementAttributes<
	RuiDisclosureElement,
	RuiDisclosureProps & {
		trigger?: JsxRenderable;
	}
>) {
	if (trigger != null) {
		return (
			<rui-disclosure {...props}>
				<DisclosureShell>
					<RuiDisclosureTrigger>{trigger}</RuiDisclosureTrigger>
					{children != null ? <RuiDisclosurePanel>{children}</RuiDisclosurePanel> : null}
				</DisclosureShell>
			</rui-disclosure>
		);
	}

	return (
		<rui-disclosure {...props}>
			<DisclosureShell>{children}</DisclosureShell>
		</rui-disclosure>
	);
}

export function RuiDisclosureGroup({
	children,
	...props
}: JsxCustomElementAttributes<RuiDisclosureGroupElement, RuiDisclosureGroupProps>) {
	return (
		<rui-disclosure-group {...props}>
			<div class="rui-disclosure-group" data-ref="root">
				{children}
			</div>
		</rui-disclosure-group>
	);
}
