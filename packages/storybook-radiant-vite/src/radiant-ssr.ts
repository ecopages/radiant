import type { RadiantStoryParameters } from './types';

/**
 * Optional explicit SSR override for `parameters.radiant`.
 * Normally SSR is inferred from `meta.component` — you rarely need this.
 */
export function radiantSsr(ssrModule: string, ssrExport?: string): NonNullable<RadiantStoryParameters['radiant']> {
	return ssrExport ? { ssrModule, ssrExport } : { ssrModule };
}
