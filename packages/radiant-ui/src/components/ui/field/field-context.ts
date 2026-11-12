import { createContext } from '@ecopages/radiant/context';
import type { FieldRules } from '../form/types';

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
