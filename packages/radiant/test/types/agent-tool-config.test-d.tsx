/**
 * An `@agentTool`, `createAgentTool` and `registerAgentTool` config takes plain values: JSON Schema objects for
 * `inputSchema` and `outputSchema`, and a synchronous function for `parse`, which still types the decorated method's
 * argument under standard decorators. The 0.13 lazy forms are type errors.
 *
 * @remarks Typecheck only.
 */
import { RadiantElement } from '../../src/core/radiant-element';
import { agentTool } from '../../src/decorators/agent-tool';
import { createAgentTool } from '../../src/helpers/create-agent-tool';
import { registerAgentTool } from '../../src/helpers/register-agent-tool';

type AddItem = { sku: string };
const parseAddItem = (input: unknown): AddItem => input as AddItem;
const schema = { type: 'object' };
const execute = (_item: AddItem) => undefined;

export class ToolConfigs extends RadiantElement {
	@agentTool({ name: 'plain', description: 'Plain', inputSchema: schema, outputSchema: schema, parse: parseAddItem })
	plain(_item: AddItem) {}

	// @ts-expect-error a schema is a JSON Schema object, not a function that returns one
	@agentTool({ name: 'function', description: 'Function', inputSchema: () => schema })
	fromFunction() {}

	// @ts-expect-error parse is a function, not a promise of one
	@agentTool({ name: 'promise', description: 'Promise', parse: Promise.resolve(parseAddItem) })
	fromPromise(_item: AddItem) {}
}

createAgentTool(new ToolConfigs(), { name: 'plain', description: 'Plain', inputSchema: schema, execute });

// @ts-expect-error a schema is a JSON Schema object, not a function that returns one
createAgentTool(new ToolConfigs(), { name: 'function', description: 'Function', inputSchema: () => schema, execute });

registerAgentTool({ name: 'plain', description: 'Plain', outputSchema: schema, parse: parseAddItem, execute });

// @ts-expect-error a schema is a JSON Schema object, not a promise of one
registerAgentTool({ name: 'promise', description: 'Promise', outputSchema: Promise.resolve(schema), execute });

registerAgentTool({
	name: 'getter',
	description: 'Getter',
	// @ts-expect-error a getter that returns a promise is not a parse function
	get parse() {
		return Promise.resolve(parseAddItem);
	},
	execute,
});
