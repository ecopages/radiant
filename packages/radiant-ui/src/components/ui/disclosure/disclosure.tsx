import type { JsxRenderable } from '@ecopages/jsx';
import type { RadiantSlotProps } from '@/types';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiDisclosureGroupProps } from './disclosure-group.script';
import { RuiDisclosureGroup as RuiDisclosureGroupElement } from './disclosure-group.script';
import type { RuiDisclosureProps } from './disclosure.script';
import { RuiDisclosure as RuiDisclosureElement } from './disclosure.script';

function cx(...parts: Array<string | false | null | undefined>): string {
	return parts.filter(Boolean).join(' ');
}

export type RuiDisclosureIconProps = {
	variant?: 'chevron' | 'plus';
	class?: string;
};

/** Default disclosure indicator. Override via `RuiDisclosureTrigger` `icon` prop. */
export function RuiDisclosureIcon({ variant = 'chevron', class: className }: RuiDisclosureIconProps) {
	return (
		<span
			class={cx('rui-disclosure__icon', `rui-disclosure__icon--${variant}`, className)}
			data-disclosure-icon
			aria-hidden="true"
		></span>
	);
}

export type RuiDisclosureTriggerProps = RadiantSlotProps & {
	children: JsxRenderable;
	class?: string;
	disabled?: boolean;
	/** Custom indicator. Pass `null` to hide. Defaults to chevron. */
	icon?: JsxRenderable | null;
	iconPosition?: 'start' | 'end';
};

/** Disclosure button slotted into `trigger` by default. */
export function RuiDisclosureTrigger({
	slot = 'trigger',
	children,
	class: className,
	disabled,
	icon,
	iconPosition = 'start',
}: RuiDisclosureTriggerProps) {
	const showIcon = icon !== null;
	const iconNode = showIcon ? (icon ?? <RuiDisclosureIcon />) : null;

	return (
		<button
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

export type RuiDisclosurePanelProps = {
	children: JsxRenderable;
	class?: string;
};

/** Disclosure panel in the default slot. */
export function RuiDisclosurePanel({ children, class: className }: RuiDisclosurePanelProps) {
	return (
		<div data-disclosure-panel data-ref="panel" class={cx('rui-disclosure__panel', className)}>
			<div class="rui-disclosure__panel-inner">{children}</div>
		</div>
	);
}

export const RuiDisclosure = defineRadiantView(
	RuiDisclosureElement,
	({
		slot,
		open,
		value,
		animated,
		trigger,
		children,
	}: RuiDisclosureProps &
		RadiantSlotProps & {
			trigger?: JsxRenderable;
			children?: JsxRenderable;
		}) => {
		if (trigger != null) {
			return (
				<rui-disclosure slot={slot} open={open} value={value} animated={animated}>
					<RuiDisclosureTrigger>{trigger}</RuiDisclosureTrigger>
					{children != null ? <RuiDisclosurePanel>{children}</RuiDisclosurePanel> : null}
				</rui-disclosure>
			);
		}

		return (
			<rui-disclosure slot={slot} open={open} value={value} animated={animated}>
				{children}
			</rui-disclosure>
		);
	},

	{ stylesheets: ['./disclosure.css'] },
);

export const RuiDisclosureGroup = defineRadiantView(
	RuiDisclosureGroupElement,
	({
		slot,
		multiple,
		animated,
		children,
	}: RuiDisclosureGroupProps & RadiantSlotProps & { children: JsxRenderable }) => (
		<rui-disclosure-group slot={slot} multiple={multiple} animated={animated}>
			{children}
		</rui-disclosure-group>
	),

	{ stylesheets: ['./disclosure-group.css'] },
);
