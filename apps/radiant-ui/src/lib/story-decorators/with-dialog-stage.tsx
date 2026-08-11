import type { DocsDecorator } from '@/lib/docs-stories';
import { RuiButton, installDialogs } from '@ecopages/radiant-ui';

export const DOCS_DIALOG_ID = 'docs-dialog';

/**
 * Installs the dialog registry and renders a `data-dialog-open` trigger above the story.
 *
 * @remarks
 * A factory rather than a plain constant so `TArgs` is inferred at the call site, which is what
 * types `context.args.id`. Options, if ever needed, belong as arguments here — `DocsDecorator`
 * contexts expose only `parameters.docs`, so there is no parameter channel to read them from.
 */
export function withDialogStage<TArgs extends { id?: string }>(): DocsDecorator<TArgs> {
	return (story, context) => {
		installDialogs();

		return (
			<>
				<RuiButton type="button" data-dialog-open={context.args.id ?? DOCS_DIALOG_ID}>
					Open dialog
				</RuiButton>
				<div style="margin-top: 1rem">{story()}</div>
			</>
		);
	};
}
