import { afterEach, describe, test } from 'vitest';
import { syncExamples } from '../src/components/primitive-example/mount-example';
import { expectInspectorCallsTheCart } from './agent-tools-inspector-flow';

type Registered = { name: string; execute(input: unknown, options: { signal: AbortSignal }): Promise<unknown> };

const registered = new Map<string, Registered>();
let changed: () => void = () => {};

/**
 * A browser's own WebMCP: `document.modelContext` accepts registrations and cannot be read back, and the testing
 * surface lists and runs what the page registered.
 */
function installNativeWebMcp(): void {
	Object.defineProperty(document, 'modelContext', {
		configurable: true,
		value: {
			registerTool(tool: Registered, { signal }: { signal: AbortSignal }) {
				registered.set(tool.name, tool);
				changed();
				signal.addEventListener('abort', () => {
					registered.delete(tool.name);
					changed();
				});
				return Promise.resolve(undefined);
			},
		},
	});
	Object.defineProperty(navigator, 'modelContextTesting', {
		configurable: true,
		value: {
			listTools: () => [...registered.values()].map(({ name }) => ({ name })),
			executeTool: async (name: string, input: string) =>
				JSON.stringify(
					await registered.get(name)!.execute(JSON.parse(input), { signal: new AbortController().signal }),
				),
			registerToolsChangedCallback: (callback: () => void) => {
				changed = callback;
			},
		},
	});
}

afterEach(() => {
	document.body.innerHTML = '';
	syncExamples();
});

describe('agent tools inspector on a native modelContext', () => {
	test('lists the registered tool and calling it changes the cart', async () => {
		installNativeWebMcp();
		await import('../src/content/components/recipes/agent-tools.inspector');

		await expectInspectorCallsTheCart();
	});
});
