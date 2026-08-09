import type { JsxHtmlProps, JsxRenderable } from '@ecopages/jsx';
import type { RuiMenuButtonProps } from './menu-button.script';
import './menu-button.script';

export type RuiMenuItem = {
	value: string;
	label: JsxRenderable;
	disabled?: boolean;
};

/**
 * Importable JSX helper around `<rui-menu-button>`.
 *
 * Accepts a `trigger` label and `items`; renders the popup items as
 * `role="menuitem"` buttons.
 *
 * @cssclass rui-menu-button__item - Menu item (`role="menuitem"`).
 */
export function RuiMenuButton({
	trigger,
	items,
	...props
}: JsxHtmlProps<RuiMenuButtonProps & { slot?: string; trigger: JsxRenderable; items: RuiMenuItem[] }>) {
	return (
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
	);
}
