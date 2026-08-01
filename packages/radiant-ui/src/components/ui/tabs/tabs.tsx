import type { JsxHtmlPropsWithChildren, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiTabsProps } from './tabs.script';
import { RuiTabs as RuiTabsElement } from './tabs.script';

export type RuiTabListProps = JsxHtmlPropsWithChildren<{
	'aria-label'?: string;
}>;

export type RuiTabProps = {
	id: string;
	children: JsxRenderable;
	class?: string;
	disabled?: boolean;
};

export type RuiTabPanelsProps = JsxHtmlPropsWithChildren;

export type RuiTabPanelProps = {
	id: string;
	children: JsxRenderable;
	class?: string;
	/** Whether the panel is initially hidden before the tabs element initializes. */
	hidden?: boolean;
};

/** Tab strip container. Set `aria-label` (or `label` on `RuiTabs`) for the tab list name. */
export function RuiTabList({ children, class: className, ...props }: RuiTabListProps) {
	return (
		<div {...props} class={cx('rui-tabs__list', className)} role="tablist">
			{children}
		</div>
	);
}

/** Tab control. `id` pairs with the matching `RuiTabPanel` id. */
export function RuiTab({ id, children, class: className, disabled }: RuiTabProps) {
	return (
		<button
			type="button"
			class={cx('rui-tabs__tab', className)}
			role="tab"
			id={`tab-${id}`}
			data-tab-value={id}
			aria-controls={`panel-${id}`}
			aria-selected="false"
			tabindex={-1}
			disabled={disabled}
		>
			{children}
		</button>
	);
}

/** Groups tab panels below the tab list. */
export function RuiTabPanels({ children, class: className, ...props }: RuiTabPanelsProps) {
	return (
		<div {...props} class={cx('rui-tabs__panels', className)}>
			{children}
		</div>
	);
}

/** Tab panel paired with a `RuiTab` by `id`. */
export function RuiTabPanel({ id, children, class: className, hidden }: RuiTabPanelProps) {
	return (
		<div
			class={cx('rui-tabs__panel', className)}
			role="tabpanel"
			id={`panel-${id}`}
			data-tab-value={id}
			aria-labelledby={`tab-${id}`}
			tabindex={0}
			hidden={hidden}
		>
			{children}
		</div>
	);
}

export const RuiTabs = defineRadiantView(
	RuiTabsElement,
	({ children, ...props }: JsxHtmlPropsWithChildren<RuiTabsProps & { slot?: string }>) => (
		<rui-tabs {...props}>{children}</rui-tabs>
	),
	{ stylesheets: ['./tabs.css'] },
);
