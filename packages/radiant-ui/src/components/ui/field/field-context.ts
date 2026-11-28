import { registerSsrPreparationCallback } from '@ecopages/radiant';
import { createContext, resolveSsrContextValue } from '@ecopages/radiant/context';
import type { FieldRules } from '@/lib/form/types';

export type FieldContextValue = {
	name: string;
	controlId: string;
	descriptionId: string;
	errorId: string;
	/** Id of the visible label, or `''` when the field has none. */
	labelId: string;
	/** Space-separated ids for `aria-describedby`: the description, plus the error while there is a message. */
	describedBy: string;
	error?: string;
	invalid: boolean;
	required: boolean;
	disabled: boolean;
	/**
	 * The field's own rules, carried across a real SSR round-trip — `prop:rules` doesn't
	 * survive that boundary, so `RuiField` republishes them on its own context, hydrated
	 * client-side from the `<script>` this provider emits. Never carries `validate`; see
	 * `fieldProvider`'s `serialize` option.
	 */
	rules?: FieldRules;
};

export const fieldContext = createContext<FieldContextValue>(Symbol.for('rui-field-context'));

/**
 * @remarks Sets the name before server bindings and native form fallbacks run. A control that matches the
 * `exclude` selector keeps its own name, as the date inputs of a range picker do.
 */
export function registerFieldNameForSsr(control: HTMLElement & { name: string }, exclude?: string): void {
	registerSsrPreparationCallback(
		control,
		() => {
			const name = resolveSsrContextValue(fieldContext)?.name;
			if (name && !(exclude && control.matches(exclude))) {
				control.name = name;
				control.setAttribute('name', name);
			}
		},
		'beforeOnUpdated',
	);
}
