import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { withConfig } from '../../src/helpers/agent-tool-config';

describe('withConfig', () => {
	function lazyConfig() {
		const schemaBuilds = vi.fn(() => ({ type: 'object' }));
		const parseReads = vi.fn();
		const config = {
			name: 'add-item',
			description: 'Adds an item',
			inputSchema: schemaBuilds,
			get parse() {
				parseReads();
				return (input: unknown) => input;
			},
			execute: () => undefined,
		};
		return { config, schemaBuilds, parseReads };
	}

	it('overrides one field without calling the inputSchema function or the parse getter', () => {
		const { config, schemaBuilds, parseReads } = lazyConfig();
		const getEnabled = () => false;

		const overridden = withConfig(config, { getEnabled });

		expect(overridden.getEnabled).toBe(getEnabled);
		expect(overridden.name).toBe('add-item');
		expect(overridden.inputSchema).toBe(schemaBuilds);
		expect(schemaBuilds).not.toHaveBeenCalled();
		expect(parseReads).not.toHaveBeenCalled();
	});

	it('keeps the parse getter lazy on the copy until it is read', () => {
		const { config, parseReads } = lazyConfig();

		const overridden = withConfig(config, { getEnabled: () => true });
		expect(parseReads).not.toHaveBeenCalled();

		void overridden.parse;
		expect(parseReads).toHaveBeenCalledTimes(1);
	});

	it('replaces a field of the config and leaves the original untouched', () => {
		const { config } = lazyConfig();

		const overridden = withConfig(config, { name: 'add-other-item' });

		expect(overridden.name).toBe('add-other-item');
		expect(config.name).toBe('add-item');
	});

	it('leaves out the omitted keys', () => {
		const config = {
			name: 'add-item',
			description: 'Adds an item',
			getEnabled: () => true,
			execute: () => undefined,
		};

		const overridden = withConfig(config, { name: 'add-other-item' }, ['getEnabled']);

		expect(Object.keys(overridden)).not.toContain('getEnabled');
		expect(overridden.name).toBe('add-other-item');
	});

	it('copies a frozen config, overriding and omitting its keys', () => {
		const config = Object.freeze({
			name: 'add-item',
			description: 'Adds an item',
			getEnabled: () => true,
			execute: () => undefined,
		});

		const overridden = withConfig(config, { name: 'add-other-item' }, ['getEnabled']);

		expect(overridden.name).toBe('add-other-item');
		expect(Object.keys(overridden)).not.toContain('getEnabled');
		expect(overridden.description).toBe('Adds an item');
	});

	it('keeps an override of an omitted key', () => {
		const strictParse = (input: unknown) => input;
		const config = { name: 'add-item', parse: (input: unknown) => input, execute: () => undefined };

		const overridden = withConfig(config, { parse: strictParse }, ['parse']);

		expect(overridden.parse).toBe(strictParse);
	});

	it('keeps a getter in the overrides lazy', () => {
		const { config } = lazyConfig();
		const reads = vi.fn();

		const overridden = withConfig(config, {
			get getEnabled() {
				reads();
				return () => true;
			},
		});
		expect(reads).not.toHaveBeenCalled();

		void overridden.getEnabled;
		expect(reads).toHaveBeenCalledTimes(1);
	});
});

describe('the package exports', () => {
	it('lists withConfig beside the other agent-tool helpers', () => {
		const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
			exports: Record<string, { types: string; import: string }>;
		};

		expect(manifest.exports['./helpers/agent-tool-config']).toEqual({
			types: './dist/helpers/agent-tool-config.d.ts',
			import: './dist/helpers/agent-tool-config.js',
		});
		expect(existsSync(new URL('../../src/helpers/agent-tool-config.ts', import.meta.url))).toBe(true);
	});
});
