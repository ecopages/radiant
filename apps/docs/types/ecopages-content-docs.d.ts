import type { ContentEntry } from '@ecopages/content-processor/types';
import type { DocsFrontmatter } from '../src/content/docs';

export type Entry = ContentEntry<DocsFrontmatter & Record<string, unknown>>;
export declare const entries: readonly Entry[];
export declare function getEntry(slug: string): Entry;
export declare function getEntryBySegments(segments: string[]): Entry;
