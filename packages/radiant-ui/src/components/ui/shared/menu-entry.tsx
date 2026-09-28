import type { JsxRenderable } from '@ecopages/jsx';

export type RuiMenuSeparator = {
	type: 'separator';
	id?: string;
};

export type RuiMenuItem = {
	type?: 'item';
	value: string;
	label: JsxRenderable;
	disabled?: boolean;
	items?: RuiMenuEntry[];
};

export type RuiMenuEntry = RuiMenuItem | RuiMenuSeparator;

export type RuiMenuEntryItemProps = {
	value: string;
	disabled?: boolean;
	hasSubmenu?: boolean;
	children?: JsxRenderable;
};

export type RuiMenuEntrySubmenuProps = {
	children?: JsxRenderable;
};

export type RuiMenuEntrySeparatorProps = {
	id?: string;
};

export type RuiMenuEntryViews = {
	Item: (props: RuiMenuEntryItemProps) => JsxRenderable;
	Submenu: (props: RuiMenuEntrySubmenuProps) => JsxRenderable;
	Separator: (props: RuiMenuEntrySeparatorProps) => JsxRenderable;
};

/** Renders a recursive popup menu as item / submenu sibling pairs. */
export function renderMenuEntries(items: RuiMenuEntry[], views: RuiMenuEntryViews): JsxRenderable {
	return items.map((item) => {
		if (item.type === 'separator') return views.Separator({ id: item.id });

		const hasSubmenu = Boolean(item.items?.length);
		return (
			<>
				{views.Item({
					value: item.value,
					disabled: item.disabled,
					hasSubmenu,
					children: item.label,
				})}
				{hasSubmenu ? views.Submenu({ children: renderMenuEntries(item.items ?? [], views) }) : null}
			</>
		);
	});
}
