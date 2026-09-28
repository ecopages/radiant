import type { JsxCustomElementAttributes } from '../../src/index.ts';
import type { JSX } from '../../src/jsx-runtime.ts';

interface TypeTestCodeTabsProps {
	label?: string;
	tabs?: string[];
}

declare module '../../src/types/dom-types.ts' {
	interface JsxCustomIntrinsicElements {
		'type-test-code-tabs': JsxCustomElementAttributes<HTMLElement, TypeTestCodeTabsProps>;
	}
}

type Assert<T extends true> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;
type IsNotAssignable<From, To> = [From] extends [To] ? false : true;

type TypeTestCodeTabsTag = JSX.IntrinsicElements['type-test-code-tabs'];

type RegisteredPublicPropsAreAccepted = Assert<
	IsAssignable<{ class: 'panel'; label: 'Code'; tabs: string[] }, TypeTestCodeTabsTag>
>;
type RegisteredPublicPropsRejectWrongType = Assert<
	IsNotAssignable<{ label: 'Code'; tabs: number }, TypeTestCodeTabsTag>
>;

declare const _registeredPublicPropsAreAccepted: RegisteredPublicPropsAreAccepted;
declare const _registeredPublicPropsRejectWrongType: RegisteredPublicPropsRejectWrongType;

void [_registeredPublicPropsAreAccepted, _registeredPublicPropsRejectWrongType];
