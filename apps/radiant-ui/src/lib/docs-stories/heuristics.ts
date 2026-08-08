import type { DocsArgType, DocsMetaAny, ResolvedDocsControl } from './types';

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

/**
 * Map an authored `argType` to a concrete docs control widget.
 *
 * Rules:
 * - `boolean` → switch
 * - `text` → text input
 * - `number` → number field
 * - `select` with 2…{@link DOCS_SEGMENT_OPTION_LIMIT} options → segments
 * - `select` with 1 option or more than the limit → select
 * - `select` with no options → text (fallback)
 */
export function resolveControlPresentation(
	definition: DocsArgType | undefined,
	options: readonly string[],
): DocsControlPresentation {
	const type = definition?.control?.type ?? (options.length > 0 ? 'select' : undefined);

	if (type === 'boolean') return 'boolean';
	if (type === 'number') return 'number';
	if (type === 'text') return 'text';

	if (type === 'select' || options.length > 0) {
		if (options.length === 0) return 'text';
		if (options.length >= 2 && options.length <= DOCS_SEGMENT_OPTION_LIMIT) return 'segmented';
		return 'select';
	}

	return 'text';
}

/** Flatten `meta.argTypes` into heuristic-resolved controls for the docs shell. */
export function listResolvedControls(meta: DocsMetaAny): ResolvedDocsControl[] {
	const controls: ResolvedDocsControl[] = [];
	for (const [name, definition] of Object.entries(meta.argTypes ?? {})) {
		if (!definition?.control?.type && !(definition?.options && definition.options.length > 0)) {
			continue;
		}
		const options = [...(definition.options ?? [])].map(String);
		const kind = resolveControlPresentation(definition, options);
		if (kind === 'segmented' || kind === 'select') {
			controls.push({ name, kind, options });
		} else {
			controls.push({ name, kind });
		}
	}
	return controls;
}

/** @deprecated Prefer {@link listResolvedControls}. */
export function shouldUseSegmentedControl(options: string[] | undefined): boolean {
	return Boolean(options && options.length >= 2 && options.length <= DOCS_SEGMENT_OPTION_LIMIT);
}
