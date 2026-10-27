import type { JSX_PROPS, JsxCustomElementAttributes } from '../../src/index.ts';
import type { JSX } from '../../src/jsx-runtime.ts';

interface TypeTestCodeTabsProps {
	label?: string;
	tabs?: string[];
}

class TypeTestCodeTabs extends HTMLElement {
	declare readonly [JSX_PROPS]?: TypeTestCodeTabsProps & { fromTagMap?: boolean };
}

declare global {
	interface HTMLElementTagNameMap {
		'type-test-code-tabs': TypeTestCodeTabs;
	}
}

declare module '../../src/types/dom-types.ts' {
	interface JsxCustomIntrinsicElements {
		'type-test-code-tabs': JsxCustomElementAttributes<
			HTMLElement,
			TypeTestCodeTabsProps & { fromRegistry?: boolean }
		>;
		'legacy-only-widget': JsxCustomElementAttributes<HTMLElement, { label: string }>;
	}
}

type Assert<T extends true> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;
type IsNotAssignable<From, To> = [From] extends [To] ? false : true;

type TypeTestCodeTabsTag = JSX.IntrinsicElements['type-test-code-tabs'];
type LegacyOnlyWidgetTag = JSX.IntrinsicElements['legacy-only-widget'];

type RegisteredPublicPropsAreAccepted = Assert<
	IsAssignable<{ class: 'panel'; label: 'Code'; tabs: string[] }, TypeTestCodeTabsTag>
>;
type RegisteredPublicPropsRejectWrongType = Assert<
	IsNotAssignable<{ label: 'Code'; tabs: number }, TypeTestCodeTabsTag>
>;
type RegisteredAndTagMapPropsIntersect = Assert<
	IsAssignable<{ label: 'Code'; fromTagMap: true; fromRegistry: true }, TypeTestCodeTabsTag>
>;
type RegisteredAndTagMapPropsRejectWrongType = Assert<
	IsNotAssignable<{ label: 1; fromTagMap: true; fromRegistry: true }, TypeTestCodeTabsTag>
>;
type LegacyOnlyEntryAcceptsPublicProps = Assert<IsAssignable<{ label: 'legacy' }, LegacyOnlyWidgetTag>>;
type LegacyOnlyEntryRejectsWrongType = Assert<IsNotAssignable<{ label: 1 }, LegacyOnlyWidgetTag>>;

declare const _registeredPublicPropsAreAccepted: RegisteredPublicPropsAreAccepted;
declare const _registeredPublicPropsRejectWrongType: RegisteredPublicPropsRejectWrongType;
declare const _registeredAndTagMapPropsIntersect: RegisteredAndTagMapPropsIntersect;
declare const _registeredAndTagMapPropsRejectWrongType: RegisteredAndTagMapPropsRejectWrongType;
declare const _legacyOnlyEntryAcceptsPublicProps: LegacyOnlyEntryAcceptsPublicProps;
declare const _legacyOnlyEntryRejectsWrongType: LegacyOnlyEntryRejectsWrongType;

void [
	_registeredPublicPropsAreAccepted,
	_registeredPublicPropsRejectWrongType,
	_registeredAndTagMapPropsIntersect,
	_registeredAndTagMapPropsRejectWrongType,
	_legacyOnlyEntryAcceptsPublicProps,
	_legacyOnlyEntryRejectsWrongType,
];
