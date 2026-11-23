import type { AgentToolExecuteOptions } from '@ecopages/radiant/helpers/register-agent-tool';

/** A tool as the stand-in keeps it: what an agent would see and call. */
export type StandInTool = {
	name: string;
	description: string;
	inputSchema?: Record<string, unknown>;
	execute(input: unknown, options: AgentToolExecuteOptions): Promise<unknown>;
};

/**
 * A small stand-in for `document.modelContext`, for browsers that do not have WebMCP yet.
 *
 * @remarks
 * It exists only so this page can show tools appearing and disappearing, and is not part of the recipe: the
 * recipe code talks to the real `document.modelContext`. It follows the spec where it matters here: registration
 * returns a promise, a duplicate name rejects, and a tool leaves only when the signal it was registered with aborts.
 * It reports every change as a `toolchange` event on itself.
 */
class StandInModelContext extends EventTarget {
	readonly tools = new Map<string, StandInTool>();

	registerTool(tool: StandInTool, options: { signal: AbortSignal }): Promise<undefined> {
		if (this.tools.has(tool.name)) {
			return Promise.reject(
				new DOMException(`A tool named "${tool.name}" is already registered.`, 'InvalidStateError'),
			);
		}
		this.tools.set(tool.name, tool);
		this.dispatchEvent(new Event('toolchange'));
		options.signal.addEventListener('abort', () => {
			if (this.tools.get(tool.name) === tool) {
				this.tools.delete(tool.name);
				this.dispatchEvent(new Event('toolchange'));
			}
		});
		return Promise.resolve(undefined);
	}
}

type ModelContextDocument = Document & { modelContext?: EventTarget };

/**
 * Installs the stand-in when the browser has no `document.modelContext`, and returns it, or `undefined` when the
 * browser has its own. The inspector then lists the tools through the browser's testing surface, when it offers one.
 */
export function installStandIn(): StandInModelContext | undefined {
	const target = document as ModelContextDocument;
	if (!target.modelContext) {
		Object.defineProperty(target, 'modelContext', { value: new StandInModelContext(), configurable: true });
	}
	return target.modelContext instanceof StandInModelContext ? target.modelContext : undefined;
}
