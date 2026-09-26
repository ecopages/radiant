import { type JsxCustomElementAttributes } from '@ecopages/jsx';
import {
	sidebarTriggerButtonClass,
	type RuiSidebarTrigger as RuiSidebarTriggerElement,
	type RuiSidebarTriggerProps,
} from './sidebar-trigger.script';
import './sidebar-trigger.script';

export type RuiSidebarTriggerViewProps = JsxCustomElementAttributes<RuiSidebarTriggerElement, RuiSidebarTriggerProps>;

function RuiSidebarTriggerIcon() {
	return (
		<span class="rui-sidebar__trigger-icon" aria-hidden="true">
			<svg
				class="rui-sidebar__trigger-glyph rui-sidebar__trigger-glyph--collapse"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
				<path d="M9 3v18" />
				<path d="m14 15 3-3-3-3" />
			</svg>
			<svg
				class="rui-sidebar__trigger-glyph rui-sidebar__trigger-glyph--expand"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
				<path d="M9 3v18" />
				<path d="m14 9-3 3 3 3" />
			</svg>
			<svg
				class="rui-sidebar__trigger-glyph rui-sidebar__trigger-glyph--close"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M18 6 6 18" />
				<path d="m6 6 12 12" />
			</svg>
			<svg
				class="rui-sidebar__trigger-glyph rui-sidebar__trigger-glyph--menu"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M4 6h16" />
				<path d="M4 12h16" />
				<path d="M4 18h16" />
			</svg>
		</span>
	);
}

/**
 * Sidebar toggle button view. Stamps `[data-ref="button"]` inside `rui-sidebar-trigger`.
 *
 * @remarks The host paints `aria-*` and `data-sidebar-state` during SSR preparation
 * and after connect. Button classes come from view props; the host re-syncs them when
 * `variant`, `size`, or `placement` change.
 */
export function RuiSidebarTrigger({
	children,
	triggerLabel,
	placement,
	variant = 'ghost',
	size = 'md',
	controls,
	...props
}: RuiSidebarTriggerViewProps) {
	return (
		<rui-sidebar-trigger
			{...props}
			prop:buttonLabel={triggerLabel}
			button-label={triggerLabel}
			placement={placement}
			variant={variant}
			size={size}
			controls={controls}
		>
			<button data-ref="button" type="button" class={sidebarTriggerButtonClass({ variant, size, placement })}>
				{children ?? <RuiSidebarTriggerIcon />}
			</button>
		</rui-sidebar-trigger>
	);
}
