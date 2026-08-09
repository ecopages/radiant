import type { DocsDecorator } from '@/lib/docs-stories';
import { RuiButton, installDialogs } from '@ecopages/radiant-ui';

export const DOCS_DIALOG_ID = 'docs-dialog';

export type DialogStageOptions = {
	trigger?: boolean;
	triggerId?: string;
	triggerLabel?: string;
};

export type DialogStageParameters = {
	dialogStage?: DialogStageOptions;
};

/** Spread into story `parameters` to configure the dialog stage decorator. */
export function dialogStage(options: DialogStageOptions): { dialogStage: DialogStageOptions } {
	return { dialogStage: options };
}

/**
 * Installs the dialog registry and optionally renders a standard `data-dialog-open` trigger
 * above the story content.
 */
export function withDialogStage<TArgs extends { id?: string }>(): DocsDecorator<TArgs> {
	return (story, context) => {
		installDialogs();

		const {
			trigger = true,
			triggerId = context.args.id ?? DOCS_DIALOG_ID,
			triggerLabel = 'Open dialog',
		} = (context.parameters as DialogStageParameters).dialogStage ?? {};

		if (!trigger) {
			return story();
		}

		return (
			<>
				<RuiButton type="button" data-dialog-open={triggerId}>
					{triggerLabel}
				</RuiButton>
				<div style="margin-top: 1rem">{story()}</div>
			</>
		);
	};
}
