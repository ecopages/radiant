import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';

export type HelperResultRow = {
	/** The call as the reader writes it. */
	code: string;
	/** What the page computed by running the same call at build time. */
	result: unknown;
};

function pad(value: number): string {
	return String(value).padStart(2, '0');
}

/**
 * Prints a value the way a `console.log` of it reads: JSON, except a `Date` (its local calendar day),
 * `undefined` and `NaN`.
 */
export function formatResult(value: unknown): string {
	if (value instanceof Date) {
		return `Date(${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())})`;
	}
	return value === undefined ? 'undefined' : (JSON.stringify(value) ?? String(value));
}

/**
 * Table of helper calls and their results.
 *
 * @remarks
 * The page passes each call's result, computed by running the call while the page renders, so the output on the
 * page is what the helper returns and cannot drift from it.
 */
export const HelperResults = eco.component<{ rows: HelperResultRow[] }, JsxRenderable>({
	render: ({ rows }) => (
		<table>
			<thead>
				<tr>
					<th>Call</th>
					<th>Result</th>
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => (
					<tr>
						<td>
							<code>{row.code}</code>
						</td>
						<td>
							<code>{formatResult(row.result)}</code>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	),
});
