/**
 * Portable docs-stories toolkit (CSF-shaped meta/stories/decorators + control heuristics).
 *
 * @remarks
 * Authoring split (see `apps/radiant-ui/README.md`):
 * - `meta.render` + `docsStory` → interactive preview and controls
 * - MDX fenced `tsx` blocks → copy-paste usage examples (not generated from args)
 * - Optional extra stories → `<Canvas>` without controls
 *
 * Copy this directory into another app, then wire a host shell that:
 * 1. Registers stories via {@link docsStory}
 * 2. Renders controls from {@link listResolvedControls} + {@link renderDocsControls}
 * 3. Hydrates radiant-ui CE scripts used by those controls
 *
 * Control presentation is automated — do not branch on option counts in the shell.
 * Heuristics: boolean→switch, text→input, number→number field, 2–3 options→segments, else→select.
 */

export type {
	DocsArgs,
	DocsArgType,
	DocsArgTypes,
	DocsControlType,
	DocsDecorator,
	DocsDecoratorContext,
	DocsMeta,
	DocsMetaAny,
	DocsStory,
	DocsStoryAny,
	ResolvedDocsControl,
} from './types';

export { DOCS_SEGMENT_OPTION_LIMIT, listResolvedControls, resolveControlPresentation } from './heuristics';

export { clearDocsStories, docsStory, getRegisteredStory, getStoryArgs, getStoryId, renderStory } from './registry';

export { renderDocsControl, renderDocsControls, renderSegmentedControl } from './render-control';

export { docsStoryContext, type DocsStoryContextValue } from './story-context';
