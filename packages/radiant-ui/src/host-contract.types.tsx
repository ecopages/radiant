import type { RuiButtonControlProps, RuiButtonLinkProps } from './components/ui/button/button';
import { RuiCalendar } from './components/ui/calendar/calendar';
import { RuiDateInput } from './components/ui/date-input/date-input';
import type { RuiDialogCloseProps } from './components/ui/dialog/dialog';
import type { RuiHeadingProps } from './components/ui/heading/heading';
import type { RuiHeadlineProps } from './components/ui/headline/headline';
import type { RuiInputProps } from './components/ui/input/input';
import { RuiMeter } from './components/ui/meter/meter';
import type { RuiNumberFieldInputProps } from './components/ui/number-field/number-field';
import type { RuiSelectSearchProps, RuiSelectViewProps } from './components/ui/select/select';
import type { RuiSidebarMenuButtonControlProps, RuiSidebarMenuButtonLinkProps } from './components/ui/sidebar/sidebar';
import type { RuiTextareaProps } from './components/ui/textarea/textarea';
import { RuiToast, RuiToaster } from './components/ui/toast/toast';
import { RuiToc } from './components/ui/toc/toc';
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
			'prop:value': string[];
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
const _inputAcceptsIntrinsicAttributes: RuiInputProps = {
	required: true,
	autocomplete: 'email',
	pattern: '[a-z]+',
};
const _textareaAcceptsIntrinsicAttributes: RuiTextareaProps = {
	required: true,
	maxlength: 80,
	autocomplete: 'off',
};
const _buttonAcceptsIntrinsicAttributes: RuiButtonControlProps = {
	type: 'submit',
	name: 'intent',
	value: 'draft',
};
const _numberFieldInputAcceptsIntrinsicAttributes: RuiNumberFieldInputProps = {
	required: true,
	name: 'qty',
};
const _selectSearchAcceptsIntrinsicAttributes: RuiSelectSearchProps = {
	required: true,
	name: 'filter',
};
const _dialogCloseAcceptsIntrinsicAttributes: RuiDialogCloseProps = {
	name: 'intent',
	value: 'close',
};
const _iconRejectsUndeclared: RuiIconProps = {
	// @ts-expect-error undeclared fields are not part of the SVG host contract
	notAField: true,
};

/**
 * A Derived Tree host's first `render()` replaces its children, so its view rejects them.
 *
 * @remarks
 * Written as JSX body children on a tag with no attributes: that is the shape TypeScript
 * does not report as an excess property, so only a `children?: never` prop catches it.
 */
const hint = <p>Hint</p>;
// @ts-expect-error the date input renders its own segments
const _dateInputRejectsChildren = <RuiDateInput>{hint}</RuiDateInput>;
// @ts-expect-error the calendar renders its own month grid
const _calendarRejectsChildren = <RuiCalendar>{hint}</RuiCalendar>;
// @ts-expect-error the toaster renders its own toast stack
const _toasterRejectsChildren = <RuiToaster>{hint}</RuiToaster>;
// @ts-expect-error the toast renders its own surface
const _toastRejectsChildren = <RuiToast>{hint}</RuiToast>;
// @ts-expect-error the table of contents renders its own link list
const _tocRejectsChildren = <RuiToc>{hint}</RuiToc>;
// @ts-expect-error the meter renders its own label, bar and readout
const _meterRejectsChildren = <RuiMeter>{hint}</RuiMeter>;

// @ts-expect-error the intrinsic date input renders its own segments
const _dateInputIntrinsicRejectsChildren = <rui-date-input>{hint}</rui-date-input>;
// @ts-expect-error the intrinsic calendar renders its own month grid
const _calendarIntrinsicRejectsChildren = <rui-calendar>{hint}</rui-calendar>;
// @ts-expect-error the intrinsic toaster renders its own toast stack
const _toasterIntrinsicRejectsChildren = <rui-toaster>{hint}</rui-toaster>;
// @ts-expect-error the intrinsic toast renders its own surface
const _toastIntrinsicRejectsChildren = <rui-toast>{hint}</rui-toast>;
// @ts-expect-error the intrinsic table of contents renders its own link list
const _tocIntrinsicRejectsChildren = <rui-toc>{hint}</rui-toc>;
// @ts-expect-error the intrinsic meter renders its own label, bar and readout
const _meterIntrinsicRejectsChildren = <rui-meter>{hint}</rui-meter>;

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
	_inputAcceptsIntrinsicAttributes,
	_textareaAcceptsIntrinsicAttributes,
	_buttonAcceptsIntrinsicAttributes,
	_numberFieldInputAcceptsIntrinsicAttributes,
	_selectSearchAcceptsIntrinsicAttributes,
	_dialogCloseAcceptsIntrinsicAttributes,
	_iconRejectsUndeclared,
	_dateInputRejectsChildren,
	_calendarRejectsChildren,
	_toasterRejectsChildren,
	_toastRejectsChildren,
	_tocRejectsChildren,
	_meterRejectsChildren,
	_dateInputIntrinsicRejectsChildren,
	_calendarIntrinsicRejectsChildren,
	_toasterIntrinsicRejectsChildren,
	_toastIntrinsicRejectsChildren,
	_tocIntrinsicRejectsChildren,
	_meterIntrinsicRejectsChildren,
];
