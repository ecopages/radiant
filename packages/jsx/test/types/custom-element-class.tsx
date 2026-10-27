import type { JSX_PROPS } from '../../src/index.ts';
import type { JSX } from '../../src/jsx-runtime.ts';
import { ThirdPartyButton } from './third-party-button.ts';

type CounterCardProps = {
	label: string;
};

class CounterCard extends HTMLElement {
	declare readonly [JSX_PROPS]?: CounterCardProps;
	label!: string;
	count!: number;
	secret!: number;
}

class OpenThirdPartyButton extends HTMLElement {}

declare global {
	interface HTMLElementTagNameMap {
		'counter-card': CounterCard;
		'sl-button': ThirdPartyButton;
		'sl-open-button': OpenThirdPartyButton;
	}
}

const validCounterCard = (
	<CounterCard
		label="x"
		id="counter"
		attr:status="ready"
		on:click={(event) => event.currentTarget}
		prop:count={2}
		prop:secret={3}
		key="counter"
	/>
);

const validCounterCardTag = <counter-card label="x" prop:count={2} />;

// @ts-expect-error The declared public label is required on the tag form too.
const missingCounterCardTagLabel = <counter-card />;

// @ts-expect-error The tag form uses the declared public prop type.
const wrongCounterCardTagLabel = <counter-card label={1} />;

// @ts-expect-error The declared public label is required.
const missingLabel = <CounterCard />;

// @ts-expect-error The public label accepts strings.
const wrongLabel = <CounterCard label={1} />;

// @ts-expect-error Instance fields stay out of the public unprefixed props.
const secretIsPrivate = <CounterCard label="x" secret={2} />;

class OpenPropsElement extends HTMLElement {
	label!: string;
}

const openPropsElement = <OpenPropsElement unknownProp={{ nested: true }} />;
const openThirdPartyButton = <sl-open-button anyUnprefixedProp={{ nested: true }} />;

declare module './third-party-button.ts' {
	interface ThirdPartyButton {
		readonly [JSX_PROPS]?: { variant?: 'primary' | 'neutral' };
	}
}

const validThirdPartyButton = <ThirdPartyButton variant="primary" prop:variant="neutral" />;
const validThirdPartyButtonTag = <sl-button variant="primary" />;

// @ts-expect-error Module augmentation narrows the third-party JSX props.
const invalidThirdPartyButton = <ThirdPartyButton variant="danger" />;

// @ts-expect-error Module augmentation narrows the third-party tag's JSX props.
const invalidThirdPartyButtonTag = <sl-button variant="danger" />;

const validNativeButton = <button type="button" disabled />;
const validUnknownCustomTag = <unlisted-widget arbitraryValue={{ nested: true }} />;

class ReadonlyMembersCard extends HTMLElement {
	declare readonly [JSX_PROPS]?: CounterCardProps;
	label!: string;
	readonly bindings = {};
	get computed(): string {
		return '';
	}
	set writable(_value: string) {}
}

const writablePropBindings = <ReadonlyMembersCard label="x" prop:label="y" prop:writable="z" prop:title="t" />;

// @ts-expect-error A readonly field cannot be assigned through prop:*.
const readonlyFieldBinding = <ReadonlyMembersCard label="x" prop:bindings={{}} />;

// @ts-expect-error A getter without a setter cannot be assigned through prop:*.
const getterOnlyBinding = <ReadonlyMembersCard label="x" prop:computed="y" />;

// @ts-expect-error A readonly DOM property cannot be assigned through prop:*.
const readonlyDomBinding = <ReadonlyMembersCard label="x" prop:clientWidth={1} />;

/** A base class that subclasses extend takes its public props as a type parameter, so no subclass redeclares them. */
class BaseCard<Props extends CounterCardProps = CounterCardProps> extends HTMLElement {
	declare readonly [JSX_PROPS]?: Props;
	label!: string;
}

class SubclassCard extends BaseCard<CounterCardProps & { level: number }> {
	level!: number;
}

const validBaseCard = <BaseCard label="x" />;

// @ts-expect-error The base class keeps its own required props.
const missingBaseLabel = <BaseCard />;

const validSubclassCard = <SubclassCard label="x" level={1} />;

// @ts-expect-error The subclass declaration adds a required prop.
const missingSubclassLevel = <SubclassCard label="x" />;

const FunctionComponent = ({ count }: { count: number }) => <span>{count}</span>;
const validFunctionComponent = <FunctionComponent count={1} />;

// @ts-expect-error Function component props retain their existing types.
const invalidFunctionComponent = <FunctionComponent count="one" />;

type CustomElementPublicPropsAreInferred =
	JSX.LibraryManagedAttributes<typeof CounterCard, {}> extends {
		label: string;
	}
		? true
		: false;
type Assert<T extends true> = T;
type PublicPropsAreInferred = Assert<CustomElementPublicPropsAreInferred>;

declare const _validCounterCard: typeof validCounterCard;
declare const _validCounterCardTag: typeof validCounterCardTag;
declare const _missingCounterCardTagLabel: typeof missingCounterCardTagLabel;
declare const _wrongCounterCardTagLabel: typeof wrongCounterCardTagLabel;
declare const _missingLabel: typeof missingLabel;
declare const _wrongLabel: typeof wrongLabel;
declare const _secretIsPrivate: typeof secretIsPrivate;
declare const _openPropsElement: typeof openPropsElement;
declare const _openThirdPartyButton: typeof openThirdPartyButton;
declare const _validThirdPartyButton: typeof validThirdPartyButton;
declare const _validThirdPartyButtonTag: typeof validThirdPartyButtonTag;
declare const _invalidThirdPartyButton: typeof invalidThirdPartyButton;
declare const _invalidThirdPartyButtonTag: typeof invalidThirdPartyButtonTag;
declare const _validNativeButton: typeof validNativeButton;
declare const _validUnknownCustomTag: typeof validUnknownCustomTag;
declare const _validFunctionComponent: typeof validFunctionComponent;
declare const _invalidFunctionComponent: typeof invalidFunctionComponent;
declare const _publicPropsAreInferred: PublicPropsAreInferred;
declare const _writablePropBindings: typeof writablePropBindings;
declare const _readonlyFieldBinding: typeof readonlyFieldBinding;
declare const _getterOnlyBinding: typeof getterOnlyBinding;
declare const _readonlyDomBinding: typeof readonlyDomBinding;
declare const _validBaseCard: typeof validBaseCard;
declare const _missingBaseLabel: typeof missingBaseLabel;
declare const _validSubclassCard: typeof validSubclassCard;
declare const _missingSubclassLevel: typeof missingSubclassLevel;

void [
	_validCounterCard,
	_validCounterCardTag,
	_missingCounterCardTagLabel,
	_wrongCounterCardTagLabel,
	_missingLabel,
	_wrongLabel,
	_secretIsPrivate,
	_openPropsElement,
	_openThirdPartyButton,
	_validThirdPartyButton,
	_validThirdPartyButtonTag,
	_invalidThirdPartyButton,
	_invalidThirdPartyButtonTag,
	_validNativeButton,
	_validUnknownCustomTag,
	_validFunctionComponent,
	_invalidFunctionComponent,
	_publicPropsAreInferred,
	_writablePropBindings,
	_readonlyFieldBinding,
	_getterOnlyBinding,
	_readonlyDomBinding,
	_validBaseCard,
	_missingBaseLabel,
	_validSubclassCard,
	_missingSubclassLevel,
];
