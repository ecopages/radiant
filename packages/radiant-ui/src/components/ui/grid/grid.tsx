import type { JsxRenderable } from '@ecopages/jsx';
import type { RadiantSlotProps } from '../../../types';
import { defineRadiantView } from '../../../lib/radiant-view';
import type { RuiGridProps } from './grid.script';
import { RuiGrid as RuiGridElement } from './grid.script';
import './grid.css';

export const RuiGrid = defineRadiantView(
	RuiGridElement,
	({ slot, label, rows }: RuiGridProps & RadiantSlotProps & { rows: JsxRenderable[][] }) => (
		<rui-grid slot={slot} label={label}>
			{rows.map((row) => (
				<div class="rui-grid__row" role="row">
					{row.map((cell) => (
						<div class="rui-grid__cell" role="gridcell" tabindex={-1}>
							{cell}
						</div>
					))}
				</div>
			))}
		</rui-grid>
	),
);
