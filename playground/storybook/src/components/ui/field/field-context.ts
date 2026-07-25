import { createContext } from '@ecopages/radiant/context';

export type FieldContextValue = {
	name: string;
	controlId: string;
	descriptionId: string;
	errorId: string;
	error?: string;
	invalid: boolean;
	required: boolean;
};

export const fieldContext = createContext<FieldContextValue>(Symbol.for('rui-field-context'));
