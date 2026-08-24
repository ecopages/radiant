import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiTable, RuiTableBody, RuiTableCell, RuiTableColumn, RuiTableHeader, RuiTableRow } from './table';

describe('RuiTable SSR', () => {
	it('renders grid semantics and composed rows', () => {
		const html = renderToString(
			<RuiTable label="Plants">
				<RuiTableHeader>
					<RuiTableColumn id="name" isRowHeader>
						Plant
					</RuiTableColumn>
				</RuiTableHeader>
				<RuiTableBody>
					<RuiTableRow id="aloe">
						<RuiTableCell isRowHeader>Aloe</RuiTableCell>
					</RuiTableRow>
				</RuiTableBody>
			</RuiTable>,
		);

		expect(html).toContain('<rui-table');
		expect(html).toContain('class="rui-table"');
		expect(html).toContain('role="grid"');
		expect(html).toContain('aria-label="Plants"');
		expect(html).toContain('data-table-column="name"');
		expect(html).toContain('data-table-row="aloe"');
		expect(html).toContain('Aloe');
	});
});
