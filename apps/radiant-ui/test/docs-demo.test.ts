import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { meta as autocompleteMeta } from '../src/content/stories/autocomplete';
import { meta as buttonMeta } from '../src/content/stories/button';

const __dirname = dirname(fileURLToPath(import.meta.url));
const demoPath = resolve(__dirname, '../src/components/component-docs/demo.tsx');
const storiesDir = resolve(__dirname, '../src/content/stories');

function serialize(element: unknown): string {
	return JSON.stringify(element);
}

describe('docs demo shell', () => {
	test('demo component does not embed live example code panel', () => {
		const source = readFileSync(demoPath, 'utf8');

		expect(source).not.toContain('code.script');
		expect(source).not.toContain('radiant-docs-code');
		expect(source).not.toContain('<Code');
	});

	test('story modules do not declare exampleCode builders', () => {
		for (const file of readdirSync(storiesDir)) {
			if (!file.endsWith('.tsx')) continue;
			const source = readFileSync(resolve(storiesDir, file), 'utf8');
			expect(source).not.toContain('exampleCode');
			expect(source).not.toMatch(/function build\w+ExampleCode/);
		}
	});

	test('simple and complex stories still expose render previews', () => {
		const button = serialize(buttonMeta.render!({ ...buttonMeta.args!, children: 'Save' }));
		const autocomplete = serialize(
			autocompleteMeta.render!({ sensitivity: 'accent' }),
		);

		expect(button).toContain('Save');
		expect(autocomplete).toContain('accent');
		expect(autocomplete).toContain('rui-autocomplete');
	});
});
