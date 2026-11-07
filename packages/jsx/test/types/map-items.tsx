import type { State } from '@ecopages/signals';
import { MapItems } from '../../src/index.ts';

type Row = { id: number; label: State<string> };
declare const rows: State<Row[]>;

export const list = (
	<ul>
		<MapItems each={rows}>{(row) => <li>{row.label}</li>}</MapItems>
	</ul>
);

// The row callback gets the item type from `each`.
export const typed = <MapItems each={rows}>{(row) => <li>{row.id.toFixed(0)}</li>}</MapItems>;

// @ts-expect-error each must be a signal, not a plain array
export const plainArray = <MapItems each={[] as Row[]}>{(row: Row) => <li>{row.id}</li>}</MapItems>;
