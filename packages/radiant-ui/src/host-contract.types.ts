import type { RuiButtonControlProps, RuiButtonLinkProps } from './components/ui/button/button';
import type { RuiHeadingProps } from './components/ui/heading/heading';
import type { RuiHeadlineProps } from './components/ui/headline/headline';
import type { RuiInputProps } from './components/ui/input/input';
import type { RuiSelectViewProps } from './components/ui/select/select';
import type { RuiSidebarMenuButtonControlProps, RuiSidebarMenuButtonLinkProps } from './components/ui/sidebar/sidebar';
import type { RuiIconProps } from './lib/icons/types';

type Assert<T extends true> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;
type IsNotAssignable<From, To> = [From] extends [To] ? false : true;
type HasKey<Type, Key extends string> = Key extends keyof Type ? true : false;

type SelectHostBindingsAccepted = Assert<
	IsAssignable<
		{
			id: 'publication-status';
			title: 'Status';
			'aria-label': string;
			'data-state': string;
			'on:click': (event: Event) => void;
			'attr:inert': true;
			'prop:value': string;
		},
		RuiSelectViewProps
	>
>;
type SelectPropValueRejectsNumber = Assert<
	IsNotAssignable<{ 'prop:value': number }, Pick<RuiSelectViewProps, 'prop:value'>>
>;

type InputNativeBranchAccepted = Assert<
	IsAssignable<{ name: string; type: 'email'; placeholder: string; 'prop:value': string }, RuiInputProps>
>;
type InputPropValueRejectsNumber = Assert<IsNotAssignable<{ 'prop:value': number }, Pick<RuiInputProps, 'prop:value'>>>;

type ButtonLinkRequiresHref = Assert<IsAssignable<{ href: '/docs' }, Pick<RuiButtonLinkProps, 'href'>>>;
type ButtonControlRejectsHref = Assert<IsNotAssignable<{ href: '/docs' }, RuiButtonControlProps>>;
type SidebarLinkRequiresHref = Assert<IsAssignable<{ href: '/inbox' }, Pick<RuiSidebarMenuButtonLinkProps, 'href'>>>;
type SidebarControlRejectsHref = Assert<IsNotAssignable<{ href: '/inbox' }, RuiSidebarMenuButtonControlProps>>;

type IconHasSvgPropBinding = Assert<HasKey<RuiIconProps, 'prop:currentScale'>>;
type IconRejectsHtmlValueBinding = Assert<IsNotAssignable<true, HasKey<RuiIconProps, 'prop:value'>>>;

type HeadingHeaderAsAccepted = Assert<IsAssignable<{ as: 'header' }, Pick<RuiHeadingProps<'header'>, 'as'>>>;
type HeadingRejectsInputAs = Assert<IsNotAssignable<'input', NonNullable<RuiHeadingProps['as']>>>;
type HeadlineH1AsAccepted = Assert<IsAssignable<{ as: 'h1' }, Pick<RuiHeadlineProps<'h1'>, 'as'>>>;
type HeadlineH1RejectsDiv = Assert<IsNotAssignable<{ as: 'div' }, Pick<RuiHeadlineProps<'h1'>, 'as'>>>;

declare const _selectHostBindingsAccepted: SelectHostBindingsAccepted;
declare const _selectPropValueRejectsNumber: SelectPropValueRejectsNumber;
declare const _inputNativeBranchAccepted: InputNativeBranchAccepted;
declare const _inputPropValueRejectsNumber: InputPropValueRejectsNumber;
declare const _buttonLinkRequiresHref: ButtonLinkRequiresHref;
declare const _buttonControlRejectsHref: ButtonControlRejectsHref;
declare const _sidebarLinkRequiresHref: SidebarLinkRequiresHref;
declare const _sidebarControlRejectsHref: SidebarControlRejectsHref;
declare const _iconHasSvgPropBinding: IconHasSvgPropBinding;
declare const _iconRejectsHtmlValueBinding: IconRejectsHtmlValueBinding;
declare const _headingHeaderAsAccepted: HeadingHeaderAsAccepted;
declare const _headingRejectsInputAs: HeadingRejectsInputAs;
declare const _headlineH1AsAccepted: HeadlineH1AsAccepted;
declare const _headlineH1RejectsDiv: HeadlineH1RejectsDiv;

const _selectRejectsUndeclared: RuiSelectViewProps = {
	// @ts-expect-error undeclared fields are not part of the select host contract
	notAField: true,
};
const _inputRejectsUndeclared: RuiInputProps = {
	// @ts-expect-error undeclared fields are not part of the input host contract
	notAField: true,
};
const _iconRejectsUndeclared: RuiIconProps = {
	// @ts-expect-error undeclared fields are not part of the SVG host contract
	notAField: true,
};

void [
	_selectHostBindingsAccepted,
	_selectPropValueRejectsNumber,
	_inputNativeBranchAccepted,
	_inputPropValueRejectsNumber,
	_buttonLinkRequiresHref,
	_buttonControlRejectsHref,
	_sidebarLinkRequiresHref,
	_sidebarControlRejectsHref,
	_iconHasSvgPropBinding,
	_iconRejectsHtmlValueBinding,
	_headingHeaderAsAccepted,
	_headingRejectsInputAs,
	_headlineH1AsAccepted,
	_headlineH1RejectsDiv,
	_selectRejectsUndeclared,
	_inputRejectsUndeclared,
	_iconRejectsUndeclared,
];
