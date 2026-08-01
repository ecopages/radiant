import type { JsxHtmlProps, JsxRenderable } from '@ecopages/jsx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiGridProps } from './grid.script';
import { RuiGrid as RuiGridElement } from './grid.script';

export const RuiGrid = defineRadiantView(
	RuiGridElement,
	({ rows, ...props }: JsxHtmlProps<RuiGridProps & { slot?: string; rows: JsxRenderable[][] }>) => (
		<rui-grid {...props}>
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
	{ stylesheets: ['./grid.css'] },
);
