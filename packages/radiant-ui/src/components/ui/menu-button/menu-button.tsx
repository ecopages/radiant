import type { JsxHtmlProps, JsxRenderable } from '@ecopages/jsx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiMenuButtonProps } from './menu-button.script';
import { RuiMenuButton as RuiMenuButtonElement } from './menu-button.script';

export type RuiMenuItem = {
	value: string;
	label: JsxRenderable;
	disabled?: boolean;
};

export const RuiMenuButton = defineRadiantView(
	RuiMenuButtonElement,
	({
		trigger,
		items,
		...props
	}: JsxHtmlProps<RuiMenuButtonProps & { slot?: string; trigger: JsxRenderable; items: RuiMenuItem[] }>) => (
		<rui-menu-button {...props}>
			<span slot="trigger">{trigger}</span>
			{items.map((item) => (
				<button
					type="button"
					class="rui-menu-button__item"
					role="menuitem"
					data-value={item.value}
					aria-disabled={item.disabled ? 'true' : undefined}
					tabindex={-1}
				>
					{item.label}
				</button>
			))}
		</rui-menu-button>
	),
	{ stylesheets: ['./menu-button.css'] },
);
