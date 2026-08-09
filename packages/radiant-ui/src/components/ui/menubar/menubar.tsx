import type { JsxHtmlProps, JsxRenderable } from '@ecopages/jsx';
import type { RuiMenubarProps } from './menubar.script';
import './menubar.script';

export type RuiMenubarItem = {
	id: string;
	label: JsxRenderable;
	/** Popup actions. When present, the top item opens a `role="menu"`. */
	items?: Array<{ id: string; label: JsxRenderable }>;
};

/**
 * Importable JSX helper around `<rui-menubar>`.
 *
 * Renders `items` as a top-level `role="menuitem"` bar with optional
 * `role="menu"` popups.
 *
 * @cssclass rui-menubar__root - Top-level menu root (trigger + optional popup).
 * @cssclass rui-menubar__item - Top-level item (`role="menuitem"`).
 * @cssclass rui-menubar__menu - Popup menu surface (`role="menu"`, `rui-popover`).
 * @cssclass rui-menubar__menu-item - Item inside a popup (`role="menuitem"`).
 */
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
