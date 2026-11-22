import type { AgentToolExecuteOptions } from '../../src/helpers/register-agent-tool';

type RegisteredTool = {
	name: string;
	description: string;
	execute(input: unknown, options: AgentToolExecuteOptions): Promise<unknown>;
};

/**
 * A stand-in for the browser's `document.modelContext` that behaves like the spec: `registerTool` returns a
 * promise, rejects a duplicate name with `InvalidStateError` after the call has returned, and a tool leaves the
 * list only when the signal it was registered with aborts.
 */
export class FakeModelContext {
	readonly tools = new Map<string, RegisteredTool>();
	readonly registrations: RegisteredTool[] = [];
	readonly exposedTo: (readonly string[] | undefined)[] = [];
	/**
	 * When the name leaves the list after an abort: at once, or a microtask later. Whether the real browser frees a
	 * name synchronously is unverified, so tests that must not depend on it use `'microtask'`.
	 */
	releaseOnAbort: 'sync' | 'microtask' = 'sync';

	registerTool(
		tool: RegisteredTool,
		options: { signal: AbortSignal; exposedTo?: readonly string[] },
	): Promise<undefined> {
		this.registrations.push(tool);
		this.exposedTo.push(options.exposedTo);
		if (this.tools.has(tool.name)) {
			return Promise.reject(
				new DOMException(`A tool named "${tool.name}" is already registered.`, 'InvalidStateError'),
			);
		}
		this.tools.set(tool.name, tool);
		options.signal.addEventListener('abort', () => {
			const release = () => {
				if (this.tools.get(tool.name) === tool) this.tools.delete(tool.name);
			};
			if (this.releaseOnAbort === 'sync') release();
			else queueMicrotask(release);
		});
		return Promise.resolve(undefined);
	}

	get names(): string[] {
		return [...this.tools.keys()];
	}
}

export function installFakeModelContext(): FakeModelContext {
	const modelContext = new FakeModelContext();
	Object.defineProperty(document, 'modelContext', { value: modelContext, configurable: true });
	return modelContext;
}

export function uninstallFakeModelContext(): void {
	Reflect.deleteProperty(document, 'modelContext');
}
