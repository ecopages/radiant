import type { JsxCustomElementAttributes } from '../../src/index.ts';

interface RadiantSelectOption {
	label: string;
	value: string;
}

interface RadiantSelectProps {
	description?: string;
	label: string;
	options?: RadiantSelectOption[];
	value?: string;
}

class RadiantSelect extends HTMLElement {
	open = false;
	options: RadiantSelectOption[] = [];
	value = '';

	focusOption(_index: number): void {}
}

type Assert<T extends true> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;
type IsNotAssignable<From, To> = [From] extends [To] ? false : true;

type RadiantSelectAttributes = JsxCustomElementAttributes<RadiantSelect, RadiantSelectProps>;

type KnownPropBindingsAcceptElementProperty = Assert<
	IsAssignable<{ 'prop:options': RadiantSelectOption[]; label: 'Label' }, RadiantSelectAttributes>
>;
type KnownPropBindingsRejectWrongType = Assert<
	IsNotAssignable<{ 'prop:options': 'wrong'; label: 'Label' }, RadiantSelectAttributes>
>;
type RequiredPublicPropsAreEnforced = Assert<IsNotAssignable<{ description: 'Helper' }, RadiantSelectAttributes>>;
type UnprefixedPublicPropsAcceptPropsShape = Assert<
	IsAssignable<{ label: 'Label'; options: RadiantSelectOption[] }, RadiantSelectAttributes>
>;
type UnprefixedPublicPropsRejectWrongType = Assert<
	IsNotAssignable<{ label: 'Label'; options: 'wrong' }, RadiantSelectAttributes>
>;
type PublicPropsStillComeFromProps = Assert<
	IsAssignable<{ description: 'Helper'; label: 'Label'; value: 'selected' }, RadiantSelectAttributes>
>;
type UnknownPropBindingsRemainPermissive = Assert<
	IsAssignable<{ 'prop:missing': Map<string, number>; label: 'Label' }, RadiantSelectAttributes>
>;
type UnknownAttributeBindingsRemainPermissive = Assert<
	IsAssignable<{ 'attr:data-track-id': 'hero'; label: 'Label' }, RadiantSelectAttributes>
>;

declare const _knownPropBindingsAcceptElementProperty: KnownPropBindingsAcceptElementProperty;
declare const _knownPropBindingsRejectWrongType: KnownPropBindingsRejectWrongType;
declare const _requiredPublicPropsAreEnforced: RequiredPublicPropsAreEnforced;
declare const _unprefixedPublicPropsAcceptPropsShape: UnprefixedPublicPropsAcceptPropsShape;
declare const _unprefixedPublicPropsRejectWrongType: UnprefixedPublicPropsRejectWrongType;
declare const _publicPropsStillComeFromProps: PublicPropsStillComeFromProps;
declare const _unknownPropBindingsRemainPermissive: UnknownPropBindingsRemainPermissive;
declare const _unknownAttributeBindingsRemainPermissive: UnknownAttributeBindingsRemainPermissive;

void [
	_knownPropBindingsAcceptElementProperty,
	_knownPropBindingsRejectWrongType,
	_requiredPublicPropsAreEnforced,
	_unprefixedPublicPropsAcceptPropsShape,
	_unprefixedPublicPropsRejectWrongType,
	_publicPropsStillComeFromProps,
	_unknownPropBindingsRemainPermissive,
	_unknownAttributeBindingsRemainPermissive,
];
