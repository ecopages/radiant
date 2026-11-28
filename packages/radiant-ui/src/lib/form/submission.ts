import { registerSsrPreparationCallback } from '@ecopages/radiant';
import { createContext, resolveSsrContextValue } from '@ecopages/radiant/context';

export type SubmissionContextValue = {
	/** Name the controls inside the provider submit under. Empty when nothing names them. */
	name: string;
	/** Whether the provider disables the controls inside it. */
	disabled: boolean;
};

/**
 * The name a control submits under, and whether it is disabled, in server markup, published by the nearest
 * `RuiField`.
 *
 * @remarks A control takes the nearest value through {@link registerSubmissionForSsr}. A custom host that is
 * store-only, and wraps a control that submits natively, provides a blank value (`{ name: '', disabled: false }`)
 * so the surrounding field does not name or disable that control.
 */
export const submissionContext = createContext<SubmissionContextValue>(Symbol.for('rui-submission-context'));

/** Gives the control the name, as a property and as an attribute, so the server markup carries it. */
export function applySubmissionName(control: HTMLElement & { name: string }, name: string): void {
	control.name = name;
	control.setAttribute('name', name);
}

/**
 * Takes the control's name and disabled state from the nearest {@link submissionContext} while the control is prepared on the server.
 *
 * @remarks Call it in the constructor of a host whose inner input submits, or that submits itself, so a form posted
 * before the script loads submits under the right name. Catalog hosts do this themselves; a host registered with
 * `registerFieldControl` calls it too. Bind the host's `name` prop to the input it submits through.
 */
export function registerSubmissionForSsr(control: HTMLElement & { name: string; disabled?: boolean }): void {
	registerSsrPreparationCallback(
		control,
		() => {
			const submission = resolveSsrContextValue(submissionContext);
			if (submission?.name) {
				applySubmissionName(control, submission.name);
			}
			if (submission?.disabled) {
				control.disabled = true;
			}
		},
		'beforeOnUpdated',
	);
}
