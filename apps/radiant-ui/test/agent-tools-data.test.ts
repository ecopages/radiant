import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { addItemSchema, parseAddItem } from '../src/content/components/recipes/agent-tools.data';

/** The Zod schema the recipe's static JSON Schema mirrors. It lives here, so no schema library reaches the browser. */
const AddItem = z.object({ sku: z.string().min(1).describe('The product to add, by its SKU') });

describe('agent tools recipe data', () => {
	test('the static input schema is what z.toJSONSchema generates from the Zod schema', () => {
		const { $schema: _draft, ...generated } = z.toJSONSchema(AddItem);

		expect(addItemSchema).toEqual(generated);
	});

	test.each([{ sku: 'pear' }, { sku: 'pear', extra: 1 }])(
		'parseAddItem agrees with the Zod schema on %j',
		(input) => {
			expect(parseAddItem(input)).toEqual(AddItem.parse(input));
		},
	);

	test.each([{}, { sku: '' }, { sku: 7 }, null, 'pear', undefined])(
		'parseAddItem rejects %j like the Zod schema does',
		(input) => {
			expect(AddItem.safeParse(input).success).toBe(false);
			expect(() => parseAddItem(input)).toThrow('sku must be a non-empty string');
		},
	);
});
