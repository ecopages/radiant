import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const recipesDirectory = fileURLToPath(new URL('../src/content/components/recipes', import.meta.url));
const publicEntries = ['@ecopages/radiant-ui/controllers', '@ecopages/radiant-ui/helpers'];
const importSpecifier = /\b(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;
const recipeScripts = readdirSync(recipesDirectory).filter((file) => file.endsWith('.script.ts'));

describe('recipe scripts', () => {
	test.each(recipeScripts)('%s imports only the public controllers and helpers entries', (file) => {
		const source = readFileSync(join(recipesDirectory, file), 'utf8');
		const imports = [...source.matchAll(importSpecifier)].map((match) => match[1]);

		expect(imports.filter((specifier) => !publicEntries.includes(specifier))).toEqual([]);
	});
});
