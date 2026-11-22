export { RuiForm, type RuiFormSubmitDetail, type RuiFormInvalidDetail } from './form';
export {
	RuiForm as RuiFormElement,
	type RuiFormProps,
	type RuiFormFormatError,
	type RuiFormHandlers,
	type RuiFormResetContext,
	type RuiFormResetHandler,
	type RuiFormSubmitContext,
	type RuiFormSubmitHandler,
} from './form.script';
export {
	formContext,
	type FormContextValue,
	type FormFieldPresentation,
	type FormContextActions,
} from '@/lib/form/form-context';
export { FormStore } from '@/lib/form/form-store';
export type {
	FormStateBlurOptions,
	FormStateNativeOptions,
	FormStateStore,
	FormStateStoreSnapshot,
	NativeValidity,
} from '@/lib/form/form-state-store';
export { createRulesResolver, runRulesResolver } from '@/lib/form/resolvers';
export type { FieldRegistrationHandle } from '@/lib/form/types';
export type { FieldRules, FieldValues, Resolver, ValidationMode, FormState, FieldError } from '@/lib/form/types';
export {
	findFieldControl,
	isNativeTextControl,
	readControlValue,
	registerFieldControl,
	writeControlValue,
	RUI_CONTROL_ATTR,
	RUI_FIELD_LABEL_ATTR,
	RUI_FIELD_DESCRIPTION_ATTR,
	RUI_FIELD_ERROR_ATTR,
	RUI_FIELD_MANAGED_ATTR,
	RUI_CONTROL_CONNECT_EVENT,
	announceControlConnect,
	RUI_FIELD_WARNING_ATTR,
} from '@/lib/form/control-protocol';
export type { FieldControlAdapter } from '@/lib/form/control-protocol';
