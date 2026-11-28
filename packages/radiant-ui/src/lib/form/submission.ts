import { registerSsrPreparationCallback } from '@ecopages/radiant';
import { createContext, resolveSsrContextValue } from '@ecopages/radiant/context';

export type SubmissionContextValue = {
	/** Name the control and its members submit under. Empty when nothing names them. */
	name: string;
	/** Whether the surrounding group is disabled, which its members render disabled. */
	disabled: boolean;
};

/**
 * What a control submits under in server markup, published by the nearest `RuiField`, checkbox group or other host
 * that owns the submission of its descendants.
 *
 * @remarks A provider with an empty `name` stops a surrounding name from reaching its descendants, as a date range
 * picker does for its two date inputs, which take `start-name` and `end-name` instead.
 */
export const submissionContext = createContext<SubmissionContextValue>(Symbol.for('rui-submission-context'));

/**
 * Takes the control's name and disabled state from the nearest {@link submissionContext} while the control is
 * prepared on the server.
 *
 * @remarks Call it in the constructor of a host that submits natively, or whose inner input does, so a form posted
 * before the script loads submits under the right name. Catalog hosts do this themselves; a host registered with
 * `registerFieldControl` calls it too. The host's `name` prop must be bound to the input it submits through.
 */
export function registerSubmissionForSsr(control: HTMLElement & { name: string; disabled: boolean }): void {
	registerSsrPreparationCallback(
		control,
		() => {
			const submission = resolveSsrContextValue(submissionContext);
			if (submission?.name) {
				control.name = submission.name;
				control.setAttribute('name', submission.name);
			}
			if (submission?.disabled) {
				control.disabled = true;
			}
		},
		'beforeOnUpdated',
	);
}
