import { highlightToHtml } from '@/lib/pierre-highlight';
import { SCRIPT_SUFFIX, present, recipeFiles, type RecipeFile, type RecipePatternId } from './recipe-files';
import type { RadiantCodeTabItem } from '@/components/code-tabs/code-tabs.script';

function highlight(files: RecipeFile[]): RadiantCodeTabItem[] {
	return files.map(({ id, label, source }) => {
		const html = highlightToHtml(source, label.slice(label.lastIndexOf('.') + 1));
		const lines = source.replace(/\n$/, '').split('\n').length;
		return {
			id,
			label,
			html: `<figure data-rehype-pretty-code-figure data-line-numbers style="--line-digits:${String(lines).length}">${html}</figure>`,
			content: source,
			lines,
		};
	});
}

export { SCRIPT_SUFFIX, recipeFiles, recipeMarkup, withoutMount, type RecipePatternId } from './recipe-files';

export const PATTERNS: RecipePatternId[] = ['element', 'component', 'controller', 'plain'];
const recipes = present
	.filter((file) => file.endsWith('.mdx') && file !== 'overview.mdx')
	.map((file) => file.replace(/\.mdx$/, ''));

/**
 * Highlighted once when the module loads, because a component renders synchronously: every pattern of every recipe,
 * keyed `<recipe>/<pattern>`.
 */
const tabsByRecipe = new Map<string, RadiantCodeTabItem[]>();
for (const recipe of recipes) {
	for (const pattern of PATTERNS) {
		if (present.includes(`${recipe}.${SCRIPT_SUFFIX[pattern]}`)) {
			tabsByRecipe.set(`${recipe}/${pattern}`, highlight(recipeFiles(recipe, pattern)));
		}
	}
}

/** The tabs `CodeTabs` takes for one pattern of a recipe, highlighted the way fenced blocks on the site are. */
export function recipeTabs(recipe: string, pattern: RecipePatternId): RadiantCodeTabItem[] {
	return tabsByRecipe.get(`${recipe}/${pattern}`)!;
}
