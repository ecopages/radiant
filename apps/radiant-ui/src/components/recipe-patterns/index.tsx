import { eco } from '@ecopages/core';
import { unsafeHtml, type JsxRenderable } from '@ecopages/jsx';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiToolbar } from '@ecopages/radiant-ui/toolbar';
import { CodeTabs } from '@/components/code-tabs';
import { PrimitiveExample } from '@/components/primitive-example';
import './recipe-patterns.script';
import { recipeMarkup, recipeTabs, type RecipePatternId } from './recipe-sources';

/** The authoring patterns a recipe can show, in tab order, and the label of the button that selects each. */
export const RECIPE_PATTERNS: Record<RecipePatternId, string> = {
	element: 'Radiant element',
	component: 'Radiant component',
	controller: 'Radiant controller',
	plain: 'Plain JavaScript',
};

export type RecipePatternsProps = {
	/** The patterns this recipe has, in tab order. The first is shown until the reader has picked another. */
	patterns: RecipePatternId[];
	/** One `RecipePattern` per entry in `patterns`, in the same order. */
	children?: JsxRenderable;
};

export type RecipePatternProps = {
	id: RecipePatternId;
	children?: JsxRenderable;
};

/**
 * Switches between the authoring patterns of one recipe, shows only the selected one and remembers the choice in
 * `localStorage`, so a recipe opened later, or the same page after a reload, starts on it. Other switches already on
 * the page do not follow.
 *
 * @remarks
 * Only the selected pattern lives in the document. The server renders the first pattern live and every pattern,
 * the first included, as an inert `template`, so a pattern that is not selected has no elements, no listeners and
 * no audio: switching removes the old example, which runs its cleanup, and inserts a fresh copy of the new one from
 * its template. The choice is stored in `localStorage` under one key shared by all recipe pages; a page that lacks
 * the stored pattern shows its first one and leaves the stored choice alone.
 *
 * The choice is exclusive but the buttons are toggle buttons with `aria-pressed`, not radios. That is the contract
 * of `RuiToolbar`, whose roving focus and `exclusiveToggles` mode this design system defines for a set of choices in
 * a toolbar; `exclusiveToggles` itself is not used because its capture handler stops the click before `onPick`
 * sees it.
 */
export const RecipePatterns = eco.component<RecipePatternsProps, JsxRenderable>({
	dependencies: {
		scripts: ['./recipe-patterns.script.ts'],
		stylesheets: ['./recipe-patterns.css'],
	},
	render: ({ patterns, children }) => {
		const panels = Array.isArray(children) ? children : [children];
		return (
			<recipe-patterns data-pattern={patterns[0]}>
				<RuiToolbar label="Authoring pattern">
					{patterns.map((pattern) => (
						<RuiButton
							size="sm"
							variant="ghost"
							data-pattern-button={pattern}
							aria-pressed={pattern === patterns[0]}
						>
							{RECIPE_PATTERNS[pattern]}
						</RuiButton>
					))}
				</RuiToolbar>
				<div class="recipe-patterns__stage" data-pattern-stage>
					{panels[0]}
				</div>
				{panels.map((panel, index) => (
					<template data-pattern-template={patterns[index]}>{panel}</template>
				))}
			</recipe-patterns>
		);
	},
});

/** Panel of one pattern, written inside `RecipePatterns` with that pattern's example and source. */
export function RecipePattern({ id, children }: RecipePatternProps): JsxRenderable {
	return <div data-pattern-panel={id}>{children}</div>;
}

export type RecipeCodeProps = {
	/** The recipe's file name stem, such as `modal`: its sources sit beside the page as `<recipe>.*`. */
	recipe: string;
	pattern: RecipePatternId;
};

/**
 * The source files of one pattern of a recipe as file-named tabs, read from the files the example runs.
 *
 * @remarks
 * Written inside the `RecipePattern` of the same pattern, below its live example.
 */
export const RecipeCode = eco.component<RecipeCodeProps, JsxRenderable>({
	dependencies: { components: [CodeTabs] },
	render: ({ recipe, pattern }) => (
		<CodeTabs label={`${RECIPE_PATTERNS[pattern]} source`} tabs={recipeTabs(recipe, pattern)} />
	),
});

export type RecipeExampleProps = {
	recipe: string;
	pattern: Exclude<RecipePatternId, 'component'>;
	layout?: 'stack';
};

/**
 * The live example of a plain, Radiant element or Radiant controller pattern, rendered from the markup file the page also shows as a
 * tab.
 *
 * @remarks
 * MDX serializes a known custom element such as `rui-slider` from its reactive properties and drops the attributes
 * written on it, which a hand-written light-DOM contract depends on. Passing the file as markup keeps every
 * attribute, and keeps the example and the code under it from drifting apart.
 */
export const RecipeExample = eco.component<RecipeExampleProps, JsxRenderable>({
	dependencies: { components: [PrimitiveExample] },
	render: ({ recipe, pattern, layout }) => (
		<PrimitiveExample name={pattern === 'plain' ? recipe : undefined} host={pattern !== 'plain'} layout={layout}>
			{unsafeHtml(recipeMarkup(recipe, pattern))}
		</PrimitiveExample>
	),
});
