/**
 * Docs page paths that changed when pages moved into section folders, as old path to new path.
 *
 * @remarks
 * `scripts/generate-redirects.ts` turns this map into the Cloudflare Pages `_redirects` file, and the legacy
 * `/llms-content/<slug>.txt` exports keep the old slugs through it. Add an entry whenever a page under
 * `src/content/docs` moves; never remove one, so links published before the move keep resolving.
 */
export const MOVED_DOCS_PATHS: Readonly<Record<string, string>> = {
	'/docs/packages/signals-effects': '/docs/signals/signals-effects',
	'/docs/packages/signals-overview': '/docs/signals/signals-overview',
	'/docs/packages/signals-resources': '/docs/signals/signals-resources',
	'/docs/packages/signals-state-computed': '/docs/signals/signals-state-computed',
	'/docs/packages/signals-stores': '/docs/signals/signals-stores',
};
