import type { JsxHtmlProps, JsxHtmlPropsWithChildren, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import type { RuiDisclosureGroupProps } from './disclosure-group.script';
import './disclosure-group.script';

import type { RuiDisclosureProps } from './disclosure.script';
import './disclosure.script';

export type RuiDisclosureIconProps = JsxHtmlProps<{
	variant?: 'chevron' | 'plus';
}>;

/** Default disclosure indicator. Override via `RuiDisclosureTrigger` `icon` prop. */
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

export type RuiDisclosureTriggerProps = JsxHtmlPropsWithChildren<{
	slot?: string;
	disabled?: boolean;
	/** Custom indicator. Pass `null` to hide. Defaults to chevron. */
	icon?: JsxRenderable | null;
	iconPosition?: 'start' | 'end';
}>;

/** Disclosure button slotted into `trigger` by default. */
export function RuiDisclosureTrigger({
	children,
	slot = 'trigger',
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
			slot={slot}
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

export type RuiDisclosurePanelProps = JsxHtmlPropsWithChildren;

/** Disclosure panel in the default slot. */
export function RuiDisclosurePanel({ children, class: className, ...props }: RuiDisclosurePanelProps) {
	return (
		<div {...props} data-disclosure-panel data-ref="panel" class={cx('rui-disclosure__panel', className)}>
			<div class="rui-disclosure__panel-inner">{children}</div>
		</div>
	);
}

export function RuiDisclosure({
	trigger,
	children,
	...props
}: JsxHtmlPropsWithChildren<
	RuiDisclosureProps & {
		slot?: string;
		trigger?: JsxRenderable;
	}
>) {
	if (trigger != null) {
		return (
			<rui-disclosure {...props}>
				<RuiDisclosureTrigger>{trigger}</RuiDisclosureTrigger>
				{children != null ? <RuiDisclosurePanel>{children}</RuiDisclosurePanel> : null}
			</rui-disclosure>
		);
	}

	return <rui-disclosure {...props}>{children}</rui-disclosure>;
}

export function RuiDisclosureGroup({
	children,
	...props
}: JsxHtmlPropsWithChildren<RuiDisclosureGroupProps & { slot?: string }>) {
	return <rui-disclosure-group {...props}>{children}</rui-disclosure-group>;
}
