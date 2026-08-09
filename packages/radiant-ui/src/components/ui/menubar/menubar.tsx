import type { JsxHtmlProps, JsxRenderable } from '@ecopages/jsx';
import type { RuiMenubarProps } from './menubar.script';
import './menubar.script';

export type RuiMenubarItem = {
	id: string;
	label: JsxRenderable;
	/** Popup actions. When present, the top item opens a `role="menu"`. */
	items?: Array<{ id: string; label: JsxRenderable }>;
};

export function RuiMenubar({
	items,
	...props
}: JsxHtmlProps<RuiMenubarProps & { slot?: string; items: RuiMenubarItem[] }>) {
	return (
		<rui-menubar {...props}>
			{items.map((item) => (
				<div class="rui-menubar__root" data-ref="menubar-root">
					<button
						type="button"
						class="rui-menubar__item"
						role="menuitem"
						tabindex={-1}
						aria-haspopup={item.items?.length ? 'true' : undefined}
						aria-expanded={item.items?.length ? 'false' : undefined}
					>
						{item.label}
					</button>
					{item.items?.length ? (
						<div class="rui-menubar__menu rui-popover rui-floating" role="menu" hidden>
							{item.items.map((child) => (
								<button
									type="button"
									class="rui-menubar__menu-item"
									role="menuitem"
									data-value={child.id}
									tabindex={-1}
								>
									{child.label}
								</button>
							))}
						</div>
					) : null}
				</div>
			))}
		</rui-menubar>
	);
}
