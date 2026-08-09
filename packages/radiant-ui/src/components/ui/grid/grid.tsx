import type { JsxHtmlProps, JsxRenderable } from '@ecopages/jsx';
import type { RuiGridProps } from './grid.script';
import './grid.script';

export function RuiGrid({ rows, ...props }: JsxHtmlProps<RuiGridProps & { slot?: string; rows: JsxRenderable[][] }>) {
	return (
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
	);
}
