import path from 'node:path';

const packageRoot = path.join(import.meta.dirname, '..');

/**
 * Vite aliases shared by `vite.config.ts` and `.storybook/main.ts`.
 *
 * @remarks
 * Two configs need these because `storybook dev` runs from the framework package and never
 * loads `vite.config.ts`. Mirrored as `paths` in `tsconfig.app.json` — that copy is
 * unavoidable, this one is not.
 *
 * `@sb` must not be `@storybook`: a Vite string alias rewrites any matching prefix with no
 * fallback, so it would swallow the real scope, including Storybook's own internal
 * `@storybook/global` import.
 */
export const radiantUiAliases: Record<string, string> = {
	'@': path.join(packageRoot, 'src'),
	'@sb': path.join(packageRoot, '.storybook'),
};
