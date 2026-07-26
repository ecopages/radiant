import type { JsxRenderable } from '@ecopages/jsx';
import type { RadiantSlotProps } from '../../../types';
import { defineRadiantView } from '../../../lib/radiant-view';
import type { RuiMenuButtonProps } from './menu-button.script';
import { RuiMenuButton as RuiMenuButtonElement } from './menu-button.script';
import './menu-button.css';

export type RuiMenuItem = {
	value: string;
	label: JsxRenderable;
	disabled?: boolean;
};

export const RuiMenuButton = defineRadiantView(
	RuiMenuButtonElement,
	({
		slot,
		open,
		placement,
		trigger,
		items,
	}: RuiMenuButtonProps &
		RadiantSlotProps & {
			trigger: JsxRenderable;
			items: RuiMenuItem[];
		}) => (
		<rui-menu-button slot={slot} open={open} placement={placement}>
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
);
