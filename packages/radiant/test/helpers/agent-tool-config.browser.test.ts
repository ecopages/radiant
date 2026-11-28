import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { createAgentTool, type AgentToolConfig } from '../../src/helpers/create-agent-tool';
import { withConfig } from '../../src/helpers/agent-tool-config';
import {
	installFakeModelContext,
	uninstallFakeModelContext,
	type FakeModelContext,
} from '../fixtures/fake-model-context';

/** An element's connect-sync work runs in a microtask after it connects. */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('withConfig on a lazy agent tool config', () => {
	let modelContext: FakeModelContext;
	const schemaBuilds = vi.fn(() => ({ type: 'object' }));
	const parseReads = vi.fn();
	let tags = 0;

	/** One lazy config, shared by every tool an app registers, as an app that overrides one field would. */
	const shared = {
		name: 'add-item',
		description: 'Adds an item',
		inputSchema: schemaBuilds,
		get parse() {
			parseReads();
			return (input: unknown) => input;
		},
		execute: () => undefined,
	};

	function mountTool(config: AgentToolConfig): HTMLElement {
		tags += 1;
		const tag = `with-config-host-${tags}`;
		@customElement(tag)
		class Host extends RadiantElement {
			constructor() {
				super();
				createAgentTool(this, config);
			}
		}
		void Host;
		const element = document.createElement(tag);
		document.body.appendChild(element);
		return element;
	}

	beforeEach(() => {
		document.body.innerHTML = '';
		schemaBuilds.mockClear();
		parseReads.mockClear();
		modelContext = installFakeModelContext();
	});

	afterEach(() => {
		uninstallFakeModelContext();
	});

	it('calls the inputSchema function and the parse getter only when the tool registers', async () => {
		const config = withConfig(shared, { getEnabled: () => true });
		expect(schemaBuilds).not.toHaveBeenCalled();
		expect(parseReads).not.toHaveBeenCalled();

		mountTool(config);
		await settle();

		expect(modelContext.names).toEqual(['add-item']);
		expect(schemaBuilds).toHaveBeenCalledTimes(1);
		expect(parseReads).toHaveBeenCalledTimes(1);
	});

	it('never calls them without document.modelContext', async () => {
		uninstallFakeModelContext();

		mountTool(withConfig(shared, { getEnabled: () => true }));
		await settle();

		expect(schemaBuilds).not.toHaveBeenCalled();
		expect(parseReads).not.toHaveBeenCalled();
	});

	it('never calls them for a tool the override leaves disabled', async () => {
		mountTool(withConfig(shared, { getEnabled: () => false }));
		await settle();

		expect(modelContext.names).toEqual([]);
		expect(schemaBuilds).not.toHaveBeenCalled();
		expect(parseReads).not.toHaveBeenCalled();
	});
});
