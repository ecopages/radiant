import { createContext } from '@ecopages/radiant/context';
import type { DocsArgs } from './types';

export type DocsStoryContextValue = {
	storyId: string;
	args: DocsArgs;
	renderRevision: number;
};

export const docsStoryContext = createContext<DocsStoryContextValue>(Symbol('docs-story-context'));
