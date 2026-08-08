/**
 * Portable docs-stories toolkit (CSF-shaped meta/stories + control heuristics).
 *
 * Copy this directory into another app, then wire a thin host shell
 * (`Demo` / `Canvas` / `Controls` custom elements) that:
 * 1. Registers stories via {@link docsStory}
 * 2. Renders controls from {@link listResolvedControls} + {@link renderDocsControls}
 * 3. Hydrates radiant-ui CE scripts used by those controls
 *
 * Control presentation is automated — do not branch on option counts in the shell.
 * Heuristics: boolean→switch, text→input, 2–3 options→segments, else→select.
 */

export type {
	DocsArgs,
	DocsArgType,
	DocsArgTypes,
	DocsControlType,
	DocsMeta,
	DocsMetaAny,
	DocsStory,
	DocsStoryAny,
	ResolvedDocsControl,
} from './types';

export {
	DOCS_SEGMENT_OPTION_LIMIT,
	listResolvedControls,
	resolveControlPresentation,
	shouldUseSegmentedControl,
} from './heuristics';

export { clearDocsStories, docsStory, getRegisteredStory, getStoryArgs, getStoryId, renderStory } from './registry';

export { buildGenericExampleCode, resolveExampleCode } from './example-code';

export { renderDocsControl, renderDocsControls, renderSegmentedControl } from './render-control';

export { docsStoryContext, type DocsStoryContextValue } from './story-context';
