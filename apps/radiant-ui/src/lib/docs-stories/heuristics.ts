import type { DocsArgType, DocsControlType, DocsMetaAny, ResolvedDocsControl } from './types';

/**
 * Max options for a segmented control. Above this, use `RuiSelect`.
 *
 * @remarks
 * Segments only work for short exclusive sets (e.g. `sm`/`md`/`lg`). Four or
 * more labels crush in a dense docs grid — select stays readable and matches
 * text-field height. Prefer select over radio here: radios need vertical space
 * that fights the control grid.
 */
export const DOCS_SEGMENT_OPTION_LIMIT = 3;

export type DocsControlPresentation = ResolvedDocsControl['kind'];

type ChoiceControlType = Extract<DocsControlType, 'radio' | 'select'>;
type ChoicePresentation = Extract<DocsControlPresentation, 'radio' | 'select' | 'segmented'>;

function isControlArg(definition: DocsArgType | undefined): definition is DocsArgType {
	return Boolean(definition?.control?.type || definition?.options?.length);
}

function authoredControlType(definition: DocsArgType, options: readonly string[]): DocsControlType | undefined {
	return definition.control?.type ?? (options.length > 0 ? 'select' : undefined);
}

/**
 * Option-count axis for authored `radio` / `select`.
 *
 * @remarks
 * Empty sets fall back to text. A single option is always a select. Radio with
 * 2+ options stays a radio group; select with 2–{@link DOCS_SEGMENT_OPTION_LIMIT}
 * options becomes segments.
 */
function presentationForChoice(type: ChoiceControlType, count: number): DocsControlPresentation {
	if (count === 0) return 'text';
	if (type === 'radio' && count >= 2) return 'radio';
	if (type === 'select' && count >= 2 && count <= DOCS_SEGMENT_OPTION_LIMIT) return 'segmented';
	return 'select';
}

function isChoiceKind(kind: DocsControlPresentation): kind is ChoicePresentation {
	return kind === 'segmented' || kind === 'select' || kind === 'radio';
}

export function resolveControlPresentation(
	definition: DocsArgType | undefined,
	options: readonly string[],
): DocsControlPresentation {
	if (!isControlArg(definition)) return 'text';

	const type = authoredControlType(definition, options);
	switch (type) {
		case 'boolean':
		case 'number':
		case 'text':
			return type;
		case 'radio':
		case 'select':
			return presentationForChoice(type, options.length);
		default:
			return 'text';
	}
}

/** Flatten `meta.argTypes` into heuristic-resolved controls for the docs shell. */
export function listResolvedControls(meta: DocsMetaAny): ResolvedDocsControl[] {
	const controls: ResolvedDocsControl[] = [];
	for (const [name, definition] of Object.entries(meta.argTypes ?? {})) {
		if (!isControlArg(definition)) continue;
		const options = [...(definition.options ?? [])].map(String);
		const kind = resolveControlPresentation(definition, options);
		controls.push(isChoiceKind(kind) ? { name, kind, options } : { name, kind });
	}
	return controls;
}
