/** What the `add_to_cart` tool takes. */
export type AddItem = { sku: string };

/**
 * The input schema the browser shows the agent: static JSON Schema, so no schema library loads on the page.
 *
 * @remarks
 * `agent-tools-data.test.ts` fails when it drifts from the Zod schema it mirrors. In an app with a build step, write
 * this file from `z.toJSONSchema` instead of by hand.
 */
export const addItemSchema = {
	type: 'object',
	properties: { sku: { type: 'string', minLength: 1, description: 'The product to add, by its SKU' } },
	required: ['sku'],
	additionalProperties: false,
};

/**
 * Rejects an input that is not an `AddItem`, before the method runs.
 *
 * @remarks
 * The recipe has no server to validate on, so the browser does. An app with a server validates there and leaves
 * `parse` out.
 */
export function parseAddItem(input: unknown): AddItem {
	if (
		typeof input !== 'object' ||
		input === null ||
		!('sku' in input) ||
		typeof input.sku !== 'string' ||
		!input.sku
	) {
		throw new TypeError('sku must be a non-empty string');
	}
	return { sku: input.sku };
}
