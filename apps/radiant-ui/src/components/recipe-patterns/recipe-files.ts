import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export type RecipePatternId = 'element' | 'component' | 'controller' | 'plain';

/**
 * @remarks
 * Resolved from the app root, not from this module: the docs build bundles this file, and `import.meta.dirname` then
 * points into the build output instead of `src`.
 */
const RECIPES_DIRECTORY = path.join(process.cwd(), 'src/content/components/recipes');
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
 * The recipe whose shared files a script uses: the `<stem>` of its `./<stem>.data` or `./<stem>.loader` import, or
 * the recipe itself when it imports neither.
 *
 * @remarks
 * A recipe built on a sibling, such as `video-player-store` on `video-player`, imports the sibling's data and loader
 * and is styled by its stylesheet, so its tabs show those files.
 */
export function sharedStem(recipe: string, source: string): string {
	return source.match(/from '\.\/([a-z0-9-]+)\.(?:data|loader)'/)?.[1] ?? recipe;
}

/**
 * The files shown for one pattern of a recipe, in tab order: the script or element, the files every pattern shares
 * (`<stem>.data.ts` and `<stem>.loader.ts`, see {@link sharedStem}) when they exist, then the markup, then the
 * stylesheet `<stem>.css` when there is one.
 *
 * @remarks
 * Every file is read from the recipe's directory, the same file the example runs, so the code on the page cannot
 * drift from it. The markup is `<recipe>.<pattern>.html`, shown as `<recipe>.html`; a component draws its own, so it has none.
 */
export function recipeFiles(recipe: string, pattern: RecipePatternId): RecipeFile[] {
	const read = (file: string) => readFileSync(path.join(RECIPES_DIRECTORY, file), 'utf8');
	const files: RecipeFile[] = [];

	const script = `${recipe}.${SCRIPT_SUFFIX[pattern]}`;
	const source = read(script);
	const stem = sharedStem(recipe, source);
	files.push({
		id: `${pattern}-script`,
		label: script,
		source: pattern === 'plain' ? withoutMount(source) : source,
	});
	for (const shared of ['data', 'loader']) {
		if (present.includes(`${stem}.${shared}.ts`)) {
			files.push({
				id: `${pattern}-${shared}`,
				label: `${stem}.${shared}.ts`,
				source: read(`${stem}.${shared}.ts`),
			});
		}
	}
	if (pattern !== 'component' && present.includes(`${recipe}.${pattern}.html`)) {
		files.push({ id: `${pattern}-markup`, label: `${recipe}.html`, source: read(`${recipe}.${pattern}.html`) });
	}
	if (present.includes(`${stem}.css`)) {
		files.push({ id: `${pattern}-styles`, label: `${stem}.css`, source: read(`${stem}.css`) });
	}
	return files;
}

/**
 * The markup the live example renders for a pattern, read from the same file the markup tab shows. Each file is one
 * root element: the host of the element and controller patterns, or the plain pattern's `<div data-example>`.
 */
export function recipeMarkup(recipe: string, pattern: Exclude<RecipePatternId, 'component'>): string {
	return readFileSync(path.join(RECIPES_DIRECTORY, `${recipe}.${pattern}.html`), 'utf8').trim();
}
