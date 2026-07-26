import type { JsxRenderable } from '@ecopages/jsx';
import type { RadiantSlotProps } from '../../../types';
import { defineRadiantView } from '../../../lib/radiant-view';
import type { RuiTabsProps } from './tabs.script';
import { RuiTabs as RuiTabsElement } from './tabs.script';
import './tabs.css';

export type RuiTabItem = {
	id: string;
	label: JsxRenderable;
	children: JsxRenderable;
};

export const RuiTabs = defineRadiantView(
	RuiTabsElement,
	({
		slot,
		value,
		label,
		automatic,
		items,
	}: RuiTabsProps &
		RadiantSlotProps & {
			items: RuiTabItem[];
		}) => (
		<rui-tabs slot={slot} value={value} label={label} automatic={automatic}>
			<div class="rui-tabs__list" role="tablist">
				{items.map((item) => (
					<button
						type="button"
						class="rui-tabs__tab"
						role="tab"
						id={`tab-${item.id}`}
						aria-controls={`panel-${item.id}`}
						aria-selected="false"
						tabindex={-1}
					>
						{item.label}
					</button>
				))}
			</div>
			{items.map((item) => (
				<div
					class="rui-tabs__panel"
					role="tabpanel"
					id={`panel-${item.id}`}
					aria-labelledby={`tab-${item.id}`}
					tabindex={0}
					hidden
				>
					{item.children}
				</div>
			))}
		</rui-tabs>
	),
);
