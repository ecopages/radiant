import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export type RecipePatternId = 'element' | 'component' | 'controller' | 'plain';

const RECIPES_DIRECTORY = path.join(import.meta.dirname, '../../content/components/recipes');
/** Every file name in the recipes directory. */
export const present = readdirSync(RECIPES_DIRECTORY);

export const SCRIPT_SUFFIX: Record<RecipePatternId, string> = {
	element: 'element.ts',
	component: 'component.tsx',
	controller: 'controller.ts',
	plain: 'script.ts',
};

export type RecipeFile = { id: string; label: string; source: string };

/**
 * Drops the registration a plain script ends with, which is how the docs site finds the example and is not part of
 * what a reader copies.
 */
export function withoutMount(source: string): string {
	return source.replace(/import \{ mountExample \}[^\n]*\n/, '').replace(/\nmountExample\([^\n]*\);\n$/, '');
}

/**
 * The files shown for one pattern of a recipe, in tab order: the script or element, the files every pattern shares
 * (`<recipe>.data.ts` and `<recipe>.loader.ts`) when the recipe has them, then the markup, then the stylesheet when
 * the recipe has one.
 *
 * @remarks
 * Every file is read from the recipe's directory, the same file the example runs, so the code on the page cannot
 * drift from it. The markup is `<recipe>.<pattern>.html`, shown as `<recipe>.html`; a component draws its own, so it has none.
 */
export function recipeFiles(recipe: string, pattern: RecipePatternId): RecipeFile[] {
	const read = (file: string) => readFileSync(path.join(RECIPES_DIRECTORY, file), 'utf8');
	const files: RecipeFile[] = [];

	const script = `${recipe}.${SCRIPT_SUFFIX[pattern]}`;
	files.push({
		id: `${pattern}-script`,
		label: script,
		source: pattern === 'plain' ? withoutMount(read(script)) : read(script),
	});
	for (const shared of ['data', 'loader']) {
		if (present.includes(`${recipe}.${shared}.ts`)) {
			files.push({
				id: `${pattern}-${shared}`,
				label: `${recipe}.${shared}.ts`,
				source: read(`${recipe}.${shared}.ts`),
			});
		}
	}
	if (pattern !== 'component' && present.includes(`${recipe}.${pattern}.html`)) {
		files.push({ id: `${pattern}-markup`, label: `${recipe}.html`, source: read(`${recipe}.${pattern}.html`) });
	}
	if (present.includes(`${recipe}.css`)) {
		files.push({ id: `${pattern}-styles`, label: `${recipe}.css`, source: read(`${recipe}.css`) });
	}
	return files;
}

/**
 * The markup the live example renders for a pattern, read from the same file the markup tab shows.
 *
 * @remarks
 * The plain form's file is the example element itself (`<div data-example>`), which the example frame already is, so
 * only its children are returned; the element and controller forms' files are the host element and are returned whole.
 */
export function recipeMarkup(recipe: string, pattern: Exclude<RecipePatternId, 'component'>): string {
	const markup = readFileSync(path.join(RECIPES_DIRECTORY, `${recipe}.${pattern}.html`), 'utf8').trim();
	return pattern === 'plain' ? markup.slice(markup.indexOf('>') + 1, markup.lastIndexOf('</div>')).trim() : markup;
}
