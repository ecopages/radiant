/**
 * Types for the `ecopages:content/components` virtual modules.
 *
 * @remarks These are ambient declarations, not a tsconfig `paths` mapping: `paths` is also read by the bundler and
 * would shadow the real virtual modules in `ecopages build`. The content processor generates the same types into
 * `node_modules/@types`, but only during a build, so a clean checkout would not typecheck without this file.
 */
declare module 'ecopages:content/components' {
	import type { ContentEntry } from '@ecopages/content-processor/types';
	import type { ComponentDocsFrontmatter } from '@/content/components';

	export type Entry = ContentEntry<ComponentDocsFrontmatter & Record<string, unknown>>;
	export const entries: readonly Entry[];
	export function getEntry(slug: string): Entry;
	export function getEntryBySegments(segments: string[]): Entry;
}

declare module 'ecopages:content/components/server' {
	import type { EcoComponent, PageDependenciesResult } from '@ecopages/core';

	export function getComponent(slug: string): Promise<EcoComponent<Record<string, unknown>>>;
	export function getEntryDependencies(slug: string): Promise<PageDependenciesResult | undefined>;
}
