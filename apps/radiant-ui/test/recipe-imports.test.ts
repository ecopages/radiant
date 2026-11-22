import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
	PATTERNS,
	SCRIPT_SUFFIX,
	recipeMarkup,
	recipeTabs,
	withoutMount,
} from '../src/components/recipe-patterns/recipe-sources';

const recipesDirectory = fileURLToPath(new URL('../src/content/components/recipes', import.meta.url));
const radiantUiEntry = /^@ecopages\/radiant-ui\/[a-z0-9-]+$/;
const mountHelper = '../../../components/primitive-example/mount-example';
const importSpecifier = /\b(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;
const recipeFiles = readdirSync(recipesDirectory);
const plainScripts = recipeFiles.filter((file) => file.endsWith('.script.ts'));
const elementScripts = recipeFiles.filter((file) => file.endsWith('.element.ts'));
const componentScripts = recipeFiles.filter((file) => file.endsWith('.component.tsx'));
const controllerScripts = recipeFiles.filter((file) => file.endsWith('.controller.ts'));
const sharedScripts = recipeFiles.filter((file) => /\.(data|loader)\.ts$/.test(file));

const importsOf = (file: string) =>
	[...readFileSync(join(recipesDirectory, file), 'utf8').matchAll(importSpecifier)].map((match) => match[1]);
/**
 * The files every pattern of one recipe shares: `./<recipe>.data` and `./<recipe>.loader`, or those of the recipe a
 * `<recipe>-<variant>` is built on.
 */
const isSiblingOf = (file: string, specifier: string) => {
	const stem = specifier.match(/^\.\/([a-z0-9-]+)\.(?:data|loader)$/)?.[1];
	const recipe = file.split('.')[0];
	return stem !== undefined && (stem === recipe || recipe.startsWith(`${stem}-`));
};
const isRadiantCore = (specifier: string) =>
	specifier === '@ecopages/radiant' || specifier.startsWith('@ecopages/radiant/');
/**
 * The schema library the agent-tools recipe shows, and the core helper its plain form registers with. They are
 * allowed there because the recipe is about them, and nowhere else.
 */
const isAgentToolsRecipeEntry = (file: string, specifier: string) =>
	file.startsWith('agent-tools.') &&
	(specifier === 'zod' || specifier === '@ecopages/radiant/helpers/register-agent-tool');
const isSignals = (specifier: string) =>
	specifier === '@ecopages/signals' || specifier.startsWith('@ecopages/signals/');

describe('recipe scripts', () => {
	test.each(plainScripts)('%s imports only public Radiant UI entries and the mount helper', (file) => {
		const rejected = importsOf(file).filter(
			(specifier) =>
				!radiantUiEntry.test(specifier) &&
				specifier !== mountHelper &&
				!isSiblingOf(file, specifier) &&
				!isAgentToolsRecipeEntry(file, specifier),
		);

		expect(rejected).toEqual([]);
	});

	test.each([...elementScripts, ...componentScripts, ...controllerScripts])(
		'%s imports public Radiant UI entries, @ecopages/radiant and @ecopages/signals, and no mount helper',
		(file) => {
			const rejected = importsOf(file).filter(
				(specifier) =>
					!radiantUiEntry.test(specifier) &&
					!isRadiantCore(specifier) &&
					!isSignals(specifier) &&
					!isSiblingOf(file, specifier) &&
					!isAgentToolsRecipeEntry(file, specifier),
			);

			expect(rejected).toEqual([]);
		},
	);

	test.each(sharedScripts)('%s imports only public entries and no sibling', (file) => {
		const rejected = importsOf(file).filter(
			(specifier) => !radiantUiEntry.test(specifier) && !isRadiantCore(specifier),
		);

		expect(rejected).toEqual([]);
	});
});

describe('recipe pages', () => {
	const slugs = recipeFiles
		.filter((file) => file.endsWith('.mdx') && file !== 'overview.mdx')
		.map((f) => f.slice(0, -4));
	const patterns = PATTERNS;
	const suffix = SCRIPT_SUFFIX;
	/** The recipe a `<recipe>-<variant>` page borrows a pattern from: the longest other recipe its slug starts with. */
	const baseOf = (slug: string) =>
		slugs
			.filter((other) => slug.startsWith(`${other}-`))
			.sort((a, b) => b.length - a.length)
			.at(0) ?? slug;
	test.each(slugs)(
		'%s lists its patterns with the Radiant forms first and plain JavaScript last, panels in the same order',
		(slug) => {
			const page = readFileSync(join(recipesDirectory, `${slug}.mdx`), 'utf8');
			const listed = [...page.match(/<RecipePatterns patterns=\{\[([^\]]*)\]\}>/)![1].matchAll(/'(\w+)'/g)].map(
				(m) => m[1],
			);
			const panels = [...page.matchAll(/<RecipePattern id="(\w+)">/g)].map((m) => m[1]);

			expect(listed).toEqual(patterns.filter((pattern) => listed.includes(pattern)));
			expect(listed.at(-1)).toBe('plain');
			expect(panels).toEqual(listed);
		},
	);

	const cases = slugs.flatMap((slug) =>
		patterns
			.filter((pattern) => recipeFiles.includes(`${slug}.${suffix[pattern]}`))
			.map((pattern) => [slug, pattern] as const),
	);

	test.each(cases)('%s page shows its %s pattern with a RecipeCode and the files as written', (slug, pattern) => {
		const page = readFileSync(join(recipesDirectory, `${slug}.mdx`), 'utf8');
		const tabs = recipeTabs(slug, pattern);
		const script = readFileSync(join(recipesDirectory, `${slug}.${suffix[pattern]}`), 'utf8');

		expect(page).toContain(`<RecipeCode recipe="${slug}" pattern="${pattern}" />`);
		expect(page).toMatch(new RegExp(`<RecipePatterns patterns=\\{\\[[^\\]]*'${pattern}'`));
		expect(tabs[0].content).toBe(pattern === 'plain' ? withoutMount(script) : script);
		expect(tabs[0].content).not.toContain('mountExample');
		expect(tabs[0].label).toBe(`${slug}.${suffix[pattern]}`);
		for (const tab of tabs) {
			expect(tab.html).toContain('data-rehype-pretty-code-figure');
		}
	});

	test.each(cases)('%s shows the stylesheet of its %s pattern last, scoped to its example', (slug, pattern) => {
		const last = recipeTabs(slug, pattern).at(-1)!;

		expect(last.label).toMatch(/\.css$/);
		expect(last.content).toContain(slug);
	});

	test.each(slugs)('%s renders its live examples from the markup files and keeps no copy in the page', (slug) => {
		const page = readFileSync(join(recipesDirectory, `${slug}.mdx`), 'utf8');
		const listed = patterns.filter((pattern) => page.includes(`<RecipePattern id="${pattern}">`));

		for (const pattern of listed.filter((pattern) => pattern !== 'component')) {
			const recipe = recipeFiles.includes(`${slug}.${suffix[pattern]}`) ? slug : baseOf(slug);
			expect(page).toMatch(new RegExp(`<RecipeExample recipe="${recipe}" pattern="${pattern}"`));
			expect(page).toContain(`<RecipeCode recipe="${recipe}" pattern="${pattern}" />`);
		}
		const markup = page.replace(/`[^`]*`/g, '');

		expect(markup).not.toMatch(/data-example=|data-controller=|<[a-z-]+-element[\s>]/);
	});

	test.each(slugs)('%s renders the example elements its markup files carry', (slug) => {
		if (recipeFiles.includes(`${slug}.element.html`)) {
			expect(recipeMarkup(slug, 'element')).toMatch(new RegExp(`^<${slug}-element[\\s>]`));
		}
		if (recipeFiles.includes(`${slug}.controller.html`)) {
			expect(recipeMarkup(slug, 'controller')).toMatch(new RegExp(`^<[a-z]+[^>]* data-controller="${slug}"`));
		}
		if (recipeFiles.includes(`${slug}.plain.html`)) {
			expect(recipeMarkup(slug, 'plain')).not.toContain('data-example');
			expect(recipeMarkup(slug, 'plain').length).toBeGreaterThan(0);
		}
	});
});

describe('recipe pattern switch', () => {
	const component = readFileSync(
		fileURLToPath(new URL('../src/components/recipe-patterns/index.tsx', import.meta.url)),
		'utf8',
	);
	const script = readFileSync(
		fileURLToPath(new URL('../src/components/recipe-patterns/recipe-patterns.script.ts', import.meta.url)),
		'utf8',
	);

	test.each(['data-pattern-button', 'data-pattern-stage', 'data-pattern-template'])(
		'the script and the component agree on %s',
		(hook) => {
			expect(script).toContain(hook);
			expect(component).toContain(hook);
		},
	);
});
