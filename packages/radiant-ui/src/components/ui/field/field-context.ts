import { createContext } from '@ecopages/radiant/context';
import type { FieldRules } from '../form/types';

export type FieldContextValue = {
	name: string;
	controlId: string;
	descriptionId: string;
	errorId: string;
	error?: string;
	invalid: boolean;
	required: boolean;
	/**
	 * The field's own rules, carried across a real SSR round-trip — `prop:rules` doesn't
	 * survive that boundary, so `RuiField` republishes them on its own context, hydrated
	 * client-side from the `<script>` this provider emits. Never carries `validate`; see
	 * `fieldProvider`'s `serialize` option.
	 */
	rules?: FieldRules;
};

export const fieldContext = createContext<FieldContextValue>(Symbol.for('rui-field-context'));
