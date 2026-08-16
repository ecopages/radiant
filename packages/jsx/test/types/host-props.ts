import type { JsxCustomElementAttributes, JsxElementProps } from '../../src/index.ts';

type Assert<T extends true> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;
type IsNotAssignable<From, To> = [From] extends [To] ? false : true;

class HostElement extends HTMLElement {
	open = false;
}

type HostAttributes = JsxCustomElementAttributes<HostElement, { label: string; value?: string }>;
type ButtonHost = JsxElementProps<HTMLButtonElement>;
type CollectionItem = Omit<JsxElementProps<HTMLButtonElement>, 'id'> & { id: string };

type DirectAriaAndDataAccepted = Assert<
	IsAssignable<{ 'aria-label': string; 'data-state': string }, Pick<ButtonHost, 'aria-label' | 'data-state'>>
>;
type EventsAndBindingsAccepted = Assert<
	IsAssignable<
		{ 'on:click': (event: Event) => void; 'attr:inert': true; 'prop:hidden': boolean },
		Pick<ButtonHost, 'on:click' | 'attr:inert' | 'prop:hidden'>
	>
>;
type TypedPropHiddenRejectsString = Assert<IsNotAssignable<{ 'prop:hidden': 'nope' }, Pick<ButtonHost, 'prop:hidden'>>>;
type CustomElementPublicPropsAccepted = Assert<IsAssignable<{ label: 'Name'; id: 'host' }, HostAttributes>>;
type CollectionIdIsRequiredString = Assert<IsAssignable<{ id: 'account' }, Pick<CollectionItem, 'id'>>>;
type CollectionIdRejectsMissing = Assert<IsNotAssignable<{}, Pick<CollectionItem, 'id'>>>;
type AriaSelectedLiteralsAccepted = Assert<
	IsAssignable<{ 'aria-selected': 'true' | 'false' }, Pick<ButtonHost, 'aria-selected'>>
>;
type AriaSelectedStringRejected = Assert<
	IsNotAssignable<{ 'aria-selected': string }, Pick<ButtonHost, 'aria-selected'>>
>;
type AriaCurrentPageAccepted = Assert<IsAssignable<{ 'aria-current': 'page' }, Pick<ButtonHost, 'aria-current'>>>;
type AriaCurrentStringRejected = Assert<IsNotAssignable<{ 'aria-current': string }, Pick<ButtonHost, 'aria-current'>>>;

declare const _directAriaAndDataAccepted: DirectAriaAndDataAccepted;
declare const _eventsAndBindingsAccepted: EventsAndBindingsAccepted;
declare const _typedPropHiddenRejectsString: TypedPropHiddenRejectsString;
declare const _customElementPublicPropsAccepted: CustomElementPublicPropsAccepted;
declare const _collectionIdIsRequiredString: CollectionIdIsRequiredString;
declare const _collectionIdRejectsMissing: CollectionIdRejectsMissing;
declare const _ariaSelectedLiteralsAccepted: AriaSelectedLiteralsAccepted;
declare const _ariaSelectedStringRejected: AriaSelectedStringRejected;
declare const _ariaCurrentPageAccepted: AriaCurrentPageAccepted;
declare const _ariaCurrentStringRejected: AriaCurrentStringRejected;

void [
	_directAriaAndDataAccepted,
	_eventsAndBindingsAccepted,
	_typedPropHiddenRejectsString,
	_customElementPublicPropsAccepted,
	_collectionIdIsRequiredString,
	_collectionIdRejectsMissing,
	_ariaSelectedLiteralsAccepted,
	_ariaSelectedStringRejected,
	_ariaCurrentPageAccepted,
	_ariaCurrentStringRejected,
];
