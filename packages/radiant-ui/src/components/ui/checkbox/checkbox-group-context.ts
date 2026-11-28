import { createContext } from '@ecopages/radiant/context';

export type CheckboxGroupContextValue = {
	/** Name the group's checkboxes submit under. */
	name: string;
	/** Whether the group is disabled. */
	disabled: boolean;
};

export const checkboxGroupContext = createContext<CheckboxGroupContextValue>(Symbol.for('rui-checkbox-group-context'));
