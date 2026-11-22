import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAgentTool, type AgentToolExecuteOptions } from '../../src/helpers/register-agent-tool';
import {
	installFakeModelContext,
	uninstallFakeModelContext,
	type FakeModelContext,
} from '../fixtures/fake-model-context';

const noop = () => undefined;

describe('registerAgentTool', () => {
	let modelContext: FakeModelContext;

	beforeEach(() => {
		modelContext = installFakeModelContext();
	});

	afterEach(() => {
		uninstallFakeModelContext();
		vi.restoreAllMocks();
	});

	it('registers the tool and removes it when the returned function is called', () => {
		const unregister = registerAgentTool({ name: 'add-item', description: 'Adds an item', execute: noop });

		expect(modelContext.names).toEqual(['add-item']);

		unregister();
		expect(modelContext.names).toEqual([]);
	});

	it('does nothing when the browser has no modelContext', () => {
		uninstallFakeModelContext();

		const unregister = registerAgentTool({ name: 'add-item', description: 'Adds an item', execute: noop });

		expect(() => unregister()).not.toThrow();
	});

	it('runs the tool with the parsed input and the abort signal', async () => {
		const execute = vi.fn((input: { sku: string }, _options: AgentToolExecuteOptions) => ({ added: input.sku }));
		registerAgentTool({
			name: 'add-item',
			description: 'Adds an item',
			parse: (input) => ({ sku: String((input as { sku: unknown }).sku) }),
			execute,
		});

		const result = await modelContext.tools
			.get('add-item')
			?.execute({ sku: 42 }, { signal: new AbortController().signal });

		expect(result).toEqual({ added: '42' });
		expect(execute.mock.calls[0]?.[0]).toEqual({ sku: '42' });
		expect(execute.mock.calls[0]?.[1].signal).toBeInstanceOf(AbortSignal);
	});

	it('rejects the call when parse throws, without running execute', async () => {
		const execute = vi.fn();
		registerAgentTool({
			name: 'add-item',
			description: 'Adds an item',
			parse: () => {
				throw new TypeError('sku is required');
			},
			execute,
		});

		await expect(
			modelContext.tools.get('add-item')?.execute({}, { signal: new AbortController().signal }),
		).rejects.toThrow('sku is required');
		expect(execute).not.toHaveBeenCalled();
	});

	it('reports a duplicate name with the tool name and the label, and does not throw', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(noop);
		registerAgentTool({ name: 'add-item', description: 'Adds an item', execute: noop });

		registerAgentTool({ name: 'add-item', description: 'Adds again', execute: noop }, { label: '<rad-cart>' });
		await Promise.resolve();

		expect(error).toHaveBeenCalledTimes(1);
		expect(error.mock.calls[0]?.[0]).toContain('"add-item"');
		expect(error.mock.calls[0]?.[0]).toContain('<rad-cart>');
	});

	it('stays silent about a rejection that follows its own unregister', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(noop);
		registerAgentTool({ name: 'add-item', description: 'Adds an item', execute: noop });
		const unregister = registerAgentTool({ name: 'add-item', description: 'Adds again', execute: noop });

		unregister();
		await Promise.resolve();

		expect(error).not.toHaveBeenCalled();
	});

	it('warns once in development about a name over the recommended budget', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(noop);
		const name = 'a-name-that-is-longer-than-the-recommended-budget';

		registerAgentTool({ name, description: 'Name budget probe', execute: noop })();
		registerAgentTool({ name, description: 'Name budget probe', execute: noop })();

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]?.[0]).toContain(name);
	});

	it('passes exposedTo to the browser', () => {
		registerAgentTool({
			name: 'add-item',
			description: 'Adds an item',
			exposedTo: ['https://example.com'],
			execute: noop,
		});

		expect(modelContext.exposedTo).toEqual([['https://example.com']]);
	});

	it('warns about a parameter description over the recommended budget', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(noop);

		registerAgentTool({
			name: 'long-parameter',
			description: 'Parameter budget probe',
			inputSchema: { type: 'object', properties: { sku: { type: 'string', description: 'x'.repeat(151) } } },
			execute: noop,
		})();

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]?.[0]).toContain('a parameter description is over 150 characters');
	});

	it('warns once that a tool exposed to other origins takes untrusted input', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(noop);
		const tool = {
			name: 'exposed-item',
			description: 'Exposure probe',
			exposedTo: ['https://agent.example.com'],
			annotations: { consequentialHint: false },
			execute: noop,
		};

		registerAgentTool(tool)();
		registerAgentTool({ ...tool, exposedTo: [], name: 'closed-item', description: 'Closed probe' })();
		registerAgentTool({ ...tool, exposedTo: undefined, name: 'private-item' })();

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]?.[0]).toContain('exposed to https://agent.example.com');
	});

	it('warns once when neither readOnlyHint nor consequentialHint is set, and not when one is', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(noop);

		registerAgentTool({
			name: 'annotated-item',
			description: 'Reads an item',
			annotations: { readOnlyHint: true },
			execute: noop,
		})();
		registerAgentTool({
			name: 'decided-item',
			description: 'Annotation probe',
			annotations: { consequentialHint: false },
			execute: noop,
		})();
		expect(warn).not.toHaveBeenCalled();

		registerAgentTool({ name: 'unannotated-item', description: 'Annotation probe', execute: noop })();
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]?.[0]).toContain('neither readOnlyHint nor consequentialHint');
	});

	it('warns once when a tool returns more than the recommended output size, without logging the value', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(noop);
		registerAgentTool({
			name: 'large-output',
			description: 'Lists items',
			annotations: { readOnlyHint: true },
			execute: () => ({ secret: 'x'.repeat(1600) }),
		});
		const run = () => modelContext.tools.get('large-output')?.execute({}, { signal: new AbortController().signal });

		await run();
		await run();

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]?.[0]).toContain('over 1500 characters');
		expect(warn.mock.calls[0]?.[0]).not.toContain('xxxx');
	});
});
