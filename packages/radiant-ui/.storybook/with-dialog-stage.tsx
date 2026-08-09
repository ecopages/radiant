import type { Decorator } from '@ecopages/storybook-radiant-vite';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiButton } from '../src/components/ui/button';
import { installDialogs } from '../src/components/ui/dialog';

export const STORY_DIALOG_ID = 'story-dialog';

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
 * CSF decorator: installs the dialog registry and optionally renders a `data-dialog-open` trigger
 * above the story content.
 */
export const withDialogStage: Decorator = (Story, context) => {
	installDialogs();

	const args = context.args as { id?: string };
	const {
		trigger = true,
		triggerId = args.id ?? STORY_DIALOG_ID,
		triggerLabel = 'Open dialog',
	} = (context.parameters as DialogStageParameters).dialogStage ?? {};

	const story = Story() as JsxRenderable;

	if (!trigger) {
		return story;
	}

	return (
		<>
			<RuiButton type="button" data-dialog-open={triggerId}>
				{triggerLabel}
			</RuiButton>
			<div style="margin-top: 1rem">{story}</div>
		</>
	);
};
