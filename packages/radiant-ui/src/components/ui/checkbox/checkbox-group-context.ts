import { createContext } from '@ecopages/radiant/context';

export type CheckboxGroupContextValue = {
	/** Values the group holds, which its checkboxes render as checked. */
	selected: readonly string[];
	/** Whether the group is disabled, which its checkboxes render disabled. */
	disabled: boolean;
};

export const checkboxGroupContext = createContext<CheckboxGroupContextValue>(Symbol.for('rui-checkbox-group-context'));
