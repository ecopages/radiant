import type { JsxCustomElementAttributes, JsxRenderable } from '@ecopages/jsx';
import type { RuiGrid as RuiGridElement, RuiGridProps } from './grid.script';
import './grid.script';

/**
 * Data grid composed from a 2-D `rows` array.
 *
 * @cssclass rui-grid__row - Table row (`role="row"`).
 * @cssclass rui-grid__cell - Table cell (`role="gridcell"`).
 *
 * @remarks The host (`<rui-grid>`) owns roving-tabindex keyboard navigation;
 * row and cell roles/classes are authored here in the view.
 */
export function RuiGrid({
	rows,
	label,
	children,
	...props
}: JsxCustomElementAttributes<RuiGridElement, RuiGridProps & { rows?: JsxRenderable[][] }>) {
	const content =
		rows != null
			? rows.map((row) => (
					<div class="rui-grid__row" role="row">
						{row.map((cell) => (
							<div class="rui-grid__cell" role="gridcell" tabindex={-1}>
								{cell}
							</div>
						))}
					</div>
				))
			: children;

	return (
		<rui-grid {...props} label={label}>
			<div class="rui-grid" data-ref="root" role="grid" aria-label={label || undefined}>
				{content}
			</div>
		</rui-grid>
	);
}
