import type { DocsDecorator } from '@/lib/docs-stories';
import { RuiButton, installDialogs } from '@ecopages/radiant-ui';

export const DOCS_DIALOG_ID = 'docs-dialog';

/**
 * Installs the dialog registry and renders a `data-dialog-open` trigger above the story.
 *
 * @remarks
 * `DocsDecorator` is contravariant in its args, so this plain constant applies to any story
 * whose args include `id`. Options, if ever needed, become parameters of a factory here —
 * `DocsDecoratorContext` exposes only `parameters.docs`, so there is no channel to read them
 * from at render time.
 */
export const withDialogStage: DocsDecorator<{ id?: string }> = (story, { args }) => {
	installDialogs();

	return (
		<>
			<RuiButton type="button" data-dialog-open={args.id ?? DOCS_DIALOG_ID}>
				Open dialog
			</RuiButton>
			<div style="margin-top: 1rem">{story()}</div>
		</>
	);
};
