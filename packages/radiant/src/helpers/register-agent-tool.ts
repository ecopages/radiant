import { isServer } from '@ecopages/radiant/is-server';
import { warnOnceInDevelopment } from './dev-warnings';

/** A JSON Schema document, passed to the browser as is. */
export type AgentToolSchema = Record<string, unknown>;

/**
 * Hints an agent or the browser can use to decide how to treat a tool.
 *
 * @remarks
 * These are the fields of the WebMCP `annotations` dictionary and all default to `false`.
 * `readOnlyHint` is for a tool that changes nothing, `consequentialHint` for a high-stakes or
 * irreversible action, and `untrustedContentHint` for a tool whose output carries user-generated
 * content.
 */
export type AgentToolAnnotations = {
	readOnlyHint?: boolean;
	consequentialHint?: boolean;
	untrustedContentHint?: boolean;
};

/** What the browser hands `execute` besides the input. */
export type AgentToolExecuteOptions = {
	/** Aborted when the tool is unregistered, so work can stop. */
	signal: AbortSignal;
};

/**
 * A WebMCP tool, as `registerAgentTool` passes it to `document.modelContext.registerTool`.
 *
 * @remarks
 * Fields of the WebMCP tool dictionary beyond these can be added here without changing how the
 * tool is registered. The spec is an origin trial and may change.
 */
export type AgentTool<Input = unknown> = {
	/** Unique among the page's tools. A duplicate rejects the registration. */
	name: string;
	description: string;
	title?: string;
	/** Plain JSON Schema. It is advisory: the agent's input is not checked against it unless `parse` does so. */
	inputSchema?: AgentToolSchema;
	outputSchema?: AgentToolSchema;
	annotations?: AgentToolAnnotations;
	/**
	 * Runs when the agent calls the tool. The fulfilled value is JSON-serialized for the agent and a
	 * rejection reaches it as an error, so return only once the page shows the change.
	 */
	execute(input: Input, options: AgentToolExecuteOptions): unknown;
};

/** Configuration for `registerAgentTool`. */
export type RegisterAgentToolConfig<Input = unknown> = AgentTool<Input> & {
	/** Origins other than this page's that may see the tool. Secure origins only. */
	exposedTo?: readonly string[];
	/**
	 * Turns the agent's input into `Input` before `execute` runs, and throws to reject the call. Pass a
	 * schema library's `parse`, such as `schema.parse`. Without it `execute` receives the input unchecked.
	 */
	parse?: (input: unknown) => Input;
};

/** Options for `registerAgentTool` beyond the tool itself. */
export type RegisterAgentToolOptions = {
	/** Names the owner in the error reported for a rejected registration, such as the host element. */
	label?: string;
};

type ModelContext = {
	registerTool(
		tool: Omit<AgentTool, 'execute'> & {
			execute(input: unknown, options: AgentToolExecuteOptions): Promise<unknown>;
		},
		options: { signal: AbortSignal; exposedTo?: readonly string[] },
	): Promise<undefined>;
};

const MAX_NAME_LENGTH = 128;
const NAME_BUDGET = 30;
const DESCRIPTION_BUDGET = 500;
const PARAMETER_DESCRIPTION_BUDGET = 150;

function longestParameterDescription(schema: unknown): number {
	if (typeof schema !== 'object' || schema === null) return 0;

	let longest = 0;
	for (const [key, value] of Object.entries(schema)) {
		if (key === 'description' && typeof value === 'string') {
			longest = Math.max(longest, value.length);
		} else if (key === 'properties' && typeof value === 'object' && value !== null) {
			for (const property of Object.values(value)) {
				longest = Math.max(longest, longestParameterDescription(property));
			}
		} else if (key === 'items') {
			longest = Math.max(longest, longestParameterDescription(value));
		}
	}
	return longest;
}

/**
 * Describes what is wrong with a tool before the browser sees it, or `undefined` when nothing is.
 *
 * @remarks
 * The browser rejects an empty name or description and a name over 128 characters. The shorter
 * limits are the budgets Chrome recommends so that agents read the tool reliably.
 */
function describeToolIssues(tool: AgentTool): string | undefined {
	const issues: string[] = [];
	if (tool.name === '') issues.push('the name is empty');
	if (tool.description === '') issues.push('the description is empty');
	if (tool.name.length > MAX_NAME_LENGTH) issues.push(`the name is over ${MAX_NAME_LENGTH} characters`);
	else if (tool.name.length > NAME_BUDGET) issues.push(`the name is over ${NAME_BUDGET} characters`);
	if (tool.description.length > DESCRIPTION_BUDGET)
		issues.push(`the description is over ${DESCRIPTION_BUDGET} characters`);
	if (longestParameterDescription(tool.inputSchema) > PARAMETER_DESCRIPTION_BUDGET)
		issues.push(`a parameter description is over ${PARAMETER_DESCRIPTION_BUDGET} characters`);

	return issues.length > 0
		? `[@ecopages/radiant] Agent tool "${tool.name}": ${issues.join(', ')}. See https://developer.chrome.com/docs/ai/webmcp/secure-tools.`
		: undefined;
}

/**
 * Registers a tool with the browser's WebMCP `document.modelContext` and returns a function that removes it.
 *
 * @param config The tool, passed through to `registerTool`, plus `parse` and `exposedTo`.
 * @param options Where to report a rejected registration.
 * @returns A function that unregisters the tool. Calling it again does nothing.
 *
 * @remarks
 * Does nothing on the server and where the browser has no `document.modelContext`. WebMCP removes a
 * tool only by aborting the signal it was registered with, so every call uses a new `AbortController`.
 * The browser rejects a duplicate name, an invalid tool, or a page where the `tools` permission policy is
 * denied, and does so after the call has returned: the rejection is reported with `console.error` naming
 * the tool, unless this registration was already unregistered, so a duplicate whose owner disconnects before the
 * rejection arrives goes unreported. The development warnings follow the shared `@ecopages/jsx` switch, so
 * `setDevWarningsEnabled(false)` silences them. The API is an origin trial and may change.
 */
export function registerAgentTool<Input = unknown>(
	config: RegisterAgentToolConfig<Input>,
	options: RegisterAgentToolOptions = {},
): () => void {
	const modelContext = (globalThis.document as (Document & { modelContext?: ModelContext }) | undefined)
		?.modelContext;
	if (isServer || !modelContext) return () => {};

	const { parse, exposedTo, execute, ...tool } = config;
	warnOnceInDevelopment(`agent-tool:${tool.name}`, () => describeToolIssues(config));

	const controller = new AbortController();
	modelContext
		.registerTool(
			{
				...tool,
				execute: async (input, executeOptions) =>
					execute(parse ? parse(input) : (input as Input), executeOptions),
			},
			{ signal: controller.signal, exposedTo },
		)
		.catch((error: unknown) => {
			if (controller.signal.aborted) return;
			const owner = options.label ? ` on ${options.label}` : '';
			console.error(`[@ecopages/radiant] Could not register agent tool "${tool.name}"${owner}.`, error);
		});

	return () => controller.abort();
}
