import { COPY_STATE_ATTRIBUTE, CopyController } from '@ecopages/radiant-ui/controllers';

/** A button that carries text to copy; one without text is ignored. */
const codeCopySelector = '[data-rehype-pretty-copy]:not([data-rehype-pretty-copy=""])';
const codeCopyStatusSelector = '[data-code-copy-status]';

/** How long the button holds its `data-copy-state` and how long the live region keeps the result. */
export const CODE_COPY_FEEDBACK_MS = 1200;

/**
 * @remarks
 * Screen readers ignore a live region write that leaves its text unchanged, so a repeated result is
 * written after the region has been empty for this long.
 */
const CODE_COPY_REANNOUNCE_DELAY_MS = 100;

let statusTimer: number | undefined;

/**
 * Writes the copy result into the base layout's live region and clears it after the feedback period.
 *
 * @remarks
 * The region is looked up on each call because browser-router navigation can replace it.
 */
function announce(message: string): void {
	const region = document.querySelector<HTMLElement>(codeCopyStatusSelector);
	if (!region) return;

	window.clearTimeout(statusTimer);
	const write = () => {
		region.textContent = message;
		statusTimer = window.setTimeout(() => {
			region.textContent = '';
		}, CODE_COPY_FEEDBACK_MS);
	};

	if (region.textContent === '') {
		write();
		return;
	}

	region.textContent = '';
	statusTimer = window.setTimeout(write, CODE_COPY_REANNOUNCE_DELAY_MS);
}

/**
 * Handles clicks on fenced code copy buttons for the whole document.
 *
 * @remarks
 * One delegated `CopyController` on the document element, so buttons inserted by a navigation work without
 * registering again. The button keeps its accessible name ("Copy code") and its icons; the result is
 * `data-copy-state` for the stylesheet and the live region for assistive technology. `getFeedbackTarget` runs
 * just before the controller writes the state, and removes the previous one with a forced reflow so the one-shot
 * animation runs again on a repeated result instead of continuing.
 *
 * @returns A function that stops the controller.
 */
export function registerCodeCopy(): () => void {
	const controller = new CopyController({
		getText: (trigger) => trigger!.dataset.rehypePrettyCopy!,
		getRoot: () => document.documentElement,
		selector: codeCopySelector,
		resetDelay: CODE_COPY_FEEDBACK_MS,
		getFeedbackTarget: (trigger) => {
			trigger!.removeAttribute(COPY_STATE_ATTRIBUTE);
			void trigger!.offsetWidth;
			return trigger;
		},
		announce: (message) => announce(message === 'Copied' ? 'Code copied to clipboard' : 'Could not copy code'),
	});
	controller.attach();
	return () => controller.destroy();
}
