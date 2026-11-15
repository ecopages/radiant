import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const recipesDirectory = fileURLToPath(new URL('../src/content/components/recipes', import.meta.url));
const publicEntries = ['@ecopages/radiant-ui/controllers', '@ecopages/radiant-ui/helpers'];
const mountHelper = '../../../components/primitive-example/mount-example';
const importSpecifier = /\b(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;
const recipeFiles = readdirSync(recipesDirectory);
const plainScripts = recipeFiles.filter((file) => file.endsWith('.script.ts'));
const elementScripts = recipeFiles.filter((file) => file.endsWith('.element.ts'));
const componentScripts = recipeFiles.filter((file) => file.endsWith('.component.tsx'));

const importsOf = (file: string) =>
	[...readFileSync(join(recipesDirectory, file), 'utf8').matchAll(importSpecifier)].map((match) => match[1]);
const isRadiantCore = (specifier: string) =>
	specifier === '@ecopages/radiant' || specifier.startsWith('@ecopages/radiant/');

describe('recipe scripts', () => {
	test.each(plainScripts)('%s imports only the public controllers and helpers entries', (file) => {
		const allowed = [...publicEntries, mountHelper];

		expect(importsOf(file).filter((specifier) => !allowed.includes(specifier))).toEqual([]);
	});

	test.each([...elementScripts, ...componentScripts])(
		'%s imports the public entries and @ecopages/radiant, and no mount helper',
		(file) => {
			const rejected = importsOf(file).filter(
				(specifier) => !publicEntries.includes(specifier) && !isRadiantCore(specifier),
			);

			expect(rejected).toEqual([]);
		},
	);
});

describe('recipe pages', () => {
	const fences = (slug: string, language = 'ts') =>
		[
			...readFileSync(join(recipesDirectory, `${slug}.mdx`), 'utf8').matchAll(
				new RegExp(`\`\`\`${language}\\n([\\s\\S]*?)\\n\`\`\``, 'g'),
			),
		].map((match) => `${match[1]}\n`);
	const withoutMount = (source: string) =>
		source.replace(/import \{ mountExample \}[^\n]*\n/, '').replace(/\nmountExample\([^\n]*\);\n$/, '');

	test.each(plainScripts.map((file) => file.replace('.script.ts', '')))(
		'%s page shows its plain script as written, without the mount registration',
		(slug) => {
			const source = readFileSync(join(recipesDirectory, `${slug}.script.ts`), 'utf8');

			expect(fences(slug)).toContain(withoutMount(source));
		},
	);

	test.each(elementScripts.map((file) => file.replace('.element.ts', '')))(
		'%s page shows its Radiant element exactly as written',
		(slug) => {
			const source = readFileSync(join(recipesDirectory, `${slug}.element.ts`), 'utf8');

			expect(fences(slug)).toContain(source);
		},
	);

	test.each(componentScripts.map((file) => file.replace('.component.tsx', '')))(
		'%s page shows its Radiant component exactly as written',
		(slug) => {
			const source = readFileSync(join(recipesDirectory, `${slug}.component.tsx`), 'utf8');

			expect(fences(slug, 'tsx')).toContain(source);
		},
	);

	const stylesheets = recipeFiles.filter((file) => file.endsWith('.css')).map((file) => file.replace('.css', ''));

	test.each(stylesheets.filter((slug) => /```css/.test(readFileSync(join(recipesDirectory, `${slug}.mdx`), 'utf8'))))(
		'%s page shows its stylesheet as written',
		(slug) => {
			const source = readFileSync(join(recipesDirectory, `${slug}.css`), 'utf8');
			const fences = [
				...readFileSync(join(recipesDirectory, `${slug}.mdx`), 'utf8').matchAll(/```css\n([\s\S]*?)\n```/g),
			].map((match) => `${match[1]}\n`);

			expect(fences).toContain(source);
		},
	);
});
