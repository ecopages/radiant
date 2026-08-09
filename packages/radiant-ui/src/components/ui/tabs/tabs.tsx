import type { JsxHtmlPropsWithChildren, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import type { RuiTabsProps } from './tabs.script';
import './tabs.script';

export type RuiTabListProps = JsxHtmlPropsWithChildren<{
	'aria-label'?: string;
}>;

export type RuiTabProps = {
	id: string;
	children: JsxRenderable;
	class?: string;
	disabled?: boolean;
	/** Whether this tab is selected in the initial document. */
	selected?: boolean;
};

export type RuiTabPanelsProps = JsxHtmlPropsWithChildren;

export type RuiTabPanelProps = {
	id: string;
	children: JsxRenderable;
	class?: string;
	/** Whether this panel is selected in the initial document. */
	selected?: boolean;
	/** Whether the panel is initially hidden when no selection is provided. */
	hidden?: boolean;
};

/**
 * Tab strip container. Set `aria-label` (or `label` on `RuiTabs`) for the tab list name.
 *
 * @cssclass rui-tabs__list - `role="tablist"` strip.
 */
export function RuiTabList({ children, class: className, ...props }: RuiTabListProps) {
	return (
		<div {...props} class={cx('rui-tabs__list', className)} role="tablist">
			{children}
		</div>
	);
}

/**
 * Tab control. `id` pairs with the matching `RuiTabPanel` id.
 *
 * @cssclass rui-tabs__tab - `role="tab"` button; underline/border per `variant`.
 */
export function RuiTab({ id, children, class: className, disabled, selected }: RuiTabProps) {
	return (
		<button
			type="button"
			class={cx('rui-tabs__tab', className)}
			role="tab"
			id={`tab-${id}`}
			data-tab-value={id}
			aria-controls={`panel-${id}`}
			aria-selected={String(selected ?? false)}
			tabindex={selected ? 0 : -1}
			disabled={disabled}
		>
			{children}
		</button>
	);
}

/**
 * Groups tab panels below the tab list.
 *
 * @cssclass rui-tabs__panels - Panel group.
 */
export function RuiTabPanels({ children, class: className, ...props }: RuiTabPanelsProps) {
	return (
		<div {...props} class={cx('rui-tabs__panels', className)}>
			{children}
		</div>
	);
}

/**
 * Tab panel paired with a `RuiTab` by `id`.
 *
 * @cssclass rui-tabs__panel - `role="tabpanel"`; hidden when not selected.
 */
export function RuiTabPanel({ id, children, class: className, selected, hidden }: RuiTabPanelProps) {
	return (
		<div
			class={cx('rui-tabs__panel', className)}
			role="tabpanel"
			id={`panel-${id}`}
			data-tab-value={id}
			aria-labelledby={`tab-${id}`}
			tabindex={0}
			hidden={selected === undefined ? hidden : !selected}
		>
			{children}
		</div>
	);
}

export function RuiTabs({ children, ...props }: JsxHtmlPropsWithChildren<RuiTabsProps & { slot?: string }>) {
	return <rui-tabs {...props}>{children}</rui-tabs>;
}
