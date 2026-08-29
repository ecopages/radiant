import type { JsxCustomElementAttributes, JsxRenderable } from '@ecopages/jsx';
import type { RuiTreegrid as RuiTreegridElement, RuiTreegridProps } from './treegrid.script';
import './treegrid.script';

export type RuiTreegridRow = {
	id: string;
	cells: JsxRenderable[];
	children?: RuiTreegridRow[];
	expanded?: boolean;
};

const TreegridRows = ({ rows }: { rows: RuiTreegridRow[] }) => (
	<>
		{rows.map((row) => (
			<>
				<div
					class="rui-treegrid__row"
					role="row"
					data-row-id={row.id}
					aria-expanded={row.children?.length ? (row.expanded ?? false) : undefined}
				>
					{row.cells.map((cell, index) => (
						<div
							class="rui-treegrid__cell"
							role="gridcell"
							tabindex={-1}
							data-col={index}
							aria-selected="false"
						>
							{cell}
						</div>
					))}
				</div>
				{row.children?.length ? (
					<div class="rui-treegrid__group" role="rowgroup" hidden={!(row.expanded ?? false)}>
						<TreegridRows rows={row.children} />
					</div>
				) : null}
			</>
		))}
	</>
);

/**
 * Treegrid view. Pass `columns` and `rows` for a data-driven grid, or `children`
 * inside the stamped root surface.
 *
 * @cssclass rui-treegrid - Root surface (`role="treegrid"`).
 * @cssclass rui-treegrid__row - Data row (`role="row"`).
 * @cssclass rui-treegrid__row--header - Header row.
 * @cssclass rui-treegrid__group - Collapsible row group (`role="rowgroup"`).
 * @cssclass rui-treegrid__cell - Data cell (`role="gridcell"`).
 * @cssclass rui-treegrid__cell--header - Column header cell (`role="columnheader"`).
 *
 * @remarks Stamps `[role="treegrid"]` with `data-ref="root"`. `rows` render
 * `[role="row"][data-row-id]` > `[role="gridcell"]` and optional `[role="rowgroup"]`.
 */
export function RuiTreegrid({
	columns,
	rows,
	label,
	children,
	...props
}: JsxCustomElementAttributes<
	RuiTreegridElement,
	RuiTreegridProps & { columns?: JsxRenderable[]; rows?: RuiTreegridRow[] }
>) {
	const content =
		columns != null && rows != null ? (
			<>
				<div class="rui-treegrid__row rui-treegrid__row--header" role="row">
					{columns.map((column) => (
						<div class="rui-treegrid__cell rui-treegrid__cell--header" role="columnheader">
							{column}
						</div>
					))}
				</div>
				<TreegridRows rows={rows} />
			</>
		) : (
			children
		);

	return (
		<rui-treegrid {...props} label={label}>
			<div class="rui-treegrid" data-ref="root" role="treegrid" aria-label={label || undefined}>
				{content}
			</div>
		</rui-treegrid>
	);
}
