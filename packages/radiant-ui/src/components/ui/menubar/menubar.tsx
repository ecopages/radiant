import type { JsxRenderable } from '@ecopages/jsx';
import type { RadiantSlotProps } from '@/types';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiMenubarProps } from './menubar.script';
import { RuiMenubar as RuiMenubarElement } from './menubar.script';
import './menubar.css';

export type RuiMenubarItem = {
	id: string;
	label: JsxRenderable;
	/** Popup actions. When present, the top item opens a `role="menu"`. */
	items?: Array<{ id: string; label: JsxRenderable }>;
};

export const RuiMenubar = defineRadiantView(
	RuiMenubarElement,
	({ slot, label, items }: RuiMenubarProps & RadiantSlotProps & { items: RuiMenubarItem[] }) => (
		<rui-menubar slot={slot} label={label}>
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
						<div class="rui-menubar__menu" role="menu" hidden>
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
	),
);
