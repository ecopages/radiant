/**
 * An `@agentTool` config takes its schemas and `parse` as values, functions or promises, and `parse` still types the
 * decorated method's argument under standard decorators.
 *
 * @remarks Typecheck only.
 */
import { RadiantElement } from '../../src/core/radiant-element';
import { agentTool } from '../../src/decorators/agent-tool';

type AddItem = { sku: string };
const parseAddItem = (input: unknown): AddItem => input as AddItem;
const schema = { type: 'object' };

export class ToolSources extends RadiantElement {
	@agentTool({ name: 'plain', description: 'Plain', inputSchema: schema, outputSchema: schema, parse: parseAddItem })
	plain(_item: AddItem) {}

	@agentTool({ name: 'function', description: 'Function', inputSchema: () => schema, outputSchema: () => schema })
	fromFunction() {}

	@agentTool({
		name: 'async',
		description: 'Async',
		inputSchema: () => Promise.resolve(schema),
		get parse() {
			return Promise.resolve(parseAddItem);
		},
	})
	fromPromise(_item: AddItem) {}
}
