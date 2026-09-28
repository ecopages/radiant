import type { Decorator } from '@ecopages/storybook-radiant-vite';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiButton } from '../src/components/ui/button';
import { installDialogs } from '../src/components/ui/dialog';

export const STORY_DIALOG_ID = 'story-dialog';

/** Installs the dialog registry. Every dialog story needs it, so apply it on `meta`. */
export const withDialogRegistry: Decorator = (Story) => {
	installDialogs();
	return Story();
};

/**
 * Renders a `data-dialog-open` trigger above the story, targeting the story's own `id` arg.
 *
 * @remarks
 * Applied per story rather than on `meta`: stories that render their own triggers simply omit
 * it. Storybook composes `meta` and story decorators instead of letting a story replace one,
 * so an opt-out flag would be the only alternative.
 */
export const withDialogTrigger: Decorator = (Story, { args }) => (
	<>
		<RuiButton type="button" data-dialog-open={(args as { id?: string }).id ?? STORY_DIALOG_ID}>
			Open dialog
		</RuiButton>
		<div style="margin-top: 1rem">{Story() as JsxRenderable}</div>
	</>
);
