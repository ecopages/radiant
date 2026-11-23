import { installStandIn } from './agent-tools.stand-in';

/** What the inspector needs to show a page's tools and call one, whichever WebMCP implementation holds them. */
export type ToolSource = {
	names(): string[];
	call(name: string, input: unknown): Promise<unknown>;
	/** Calls `listener` whenever the set of tools changes; returns what stops it. */
	subscribe(listener: () => void): () => void;
};

/**
 * The testing surface Chrome's WebMCP build exposes for tools such as its inspector extension. It is the only
 * way a script reads back what a page registered, since `document.modelContext` only accepts registrations.
 */
type ModelContextTesting = {
	listTools(): Array<{ name: string }>;
	executeTool(name: string, input: string): Promise<string | null>;
	registerToolsChangedCallback?(callback: () => void): void;
};

function fromStandIn(standIn: NonNullable<ReturnType<typeof installStandIn>>): ToolSource {
	return {
		names: () => [...standIn.tools.keys()],
		call: (name, input) => standIn.tools.get(name)!.execute(input, { signal: new AbortController().signal }),
		subscribe: (listener) => {
			standIn.addEventListener('toolchange', listener);
			return () => standIn.removeEventListener('toolchange', listener);
		},
	};
}

/**
 * @remarks `registerToolsChangedCallback` holds one callback, so subscribing replaces whichever callback was
 * there and unsubscribing replaces this one with a no-op, which can displace another subscriber. The surface
 * offers nothing better, and only the inspector subscribes on this page. Docs only.
 */
function fromModelContextTesting(testing: ModelContextTesting): ToolSource {
	return {
		names: () => testing.listTools().map((tool) => tool.name),
		call: async (name, input) => {
			const result = await testing.executeTool(name, JSON.stringify(input));
			return result === null ? null : JSON.parse(result);
		},
		subscribe: (listener) => {
			testing.registerToolsChangedCallback?.(listener);
			return () => testing.registerToolsChangedCallback?.(() => {});
		},
	};
}

/**
 * Finds where the page's tools can be read from: the stand-in when the browser has no `document.modelContext`,
 * else the browser's testing surface, else `undefined`, which means this browser's WebMCP cannot be read back.
 *
 * @remarks
 * Docs only. It reads from what the browser offers and never wraps or replaces a browser's own
 * `document.modelContext`. A page cannot list its tools through the recipe's `registerAgentTool` alone, because
 * that function forwards each registration to the browser and keeps none.
 */
export function resolveToolSource(): ToolSource | undefined {
	const standIn = installStandIn();
	if (standIn) {
		return fromStandIn(standIn);
	}
	const testing = (navigator as Navigator & { modelContextTesting?: ModelContextTesting }).modelContextTesting;
	return testing ? fromModelContextTesting(testing) : undefined;
}
