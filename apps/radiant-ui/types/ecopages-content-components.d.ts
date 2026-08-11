import type { ContentEntry } from '@ecopages/content-processor/types';
import type { ComponentDocsFrontmatter } from '../src/content/components';

export type Entry = ContentEntry<ComponentDocsFrontmatter & Record<string, unknown>>;
export declare const entries: readonly Entry[];
export declare function getEntry(slug: string): Entry;
export declare function getEntryBySegments(segments: string[]): Entry;
