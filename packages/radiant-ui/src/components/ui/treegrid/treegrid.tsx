import type { JsxHtmlProps, JsxRenderable } from '@ecopages/jsx';
import type { RuiTreegridProps } from './treegrid.script';
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

export function RuiTreegrid({
	columns,
	rows,
	...props
}: JsxHtmlProps<RuiTreegridProps & { slot?: string; columns: JsxRenderable[]; rows: RuiTreegridRow[] }>) {
	return (
		<rui-treegrid {...props}>
			<div class="rui-treegrid__row rui-treegrid__row--header" role="row">
				{columns.map((column) => (
					<div class="rui-treegrid__cell rui-treegrid__cell--header" role="columnheader">
						{column}
					</div>
				))}
			</div>
			<TreegridRows rows={rows} />
		</rui-treegrid>
	);
}
