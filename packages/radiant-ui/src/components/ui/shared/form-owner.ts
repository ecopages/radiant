/**
 * Tells whether a reset of `form` concerns a control host.
 *
 * @remarks The control's own `form` association wins, so an input outside the
 * form that points at it with `form="id"` is reset with it, and an input inside
 * form A that is re-pointed at form B is not. Hosts without an input fall back to
 * the nearest ancestor form.
 */
export function isResetBy(form: HTMLFormElement, host: Element, input: HTMLInputElement | null): boolean {
	const owner = input ? input.form : host.closest('form');
	return owner === form;
}
