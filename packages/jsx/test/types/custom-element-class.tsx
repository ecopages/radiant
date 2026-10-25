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

declare module './third-party-button.ts' {
	interface ThirdPartyButton {
		readonly [JSX_PROPS]?: { variant?: 'primary' | 'neutral' };
	}
}

const validThirdPartyButton = <ThirdPartyButton variant="primary" prop:variant="neutral" />;

// @ts-expect-error Module augmentation narrows the third-party JSX props.
const invalidThirdPartyButton = <ThirdPartyButton variant="danger" />;

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
declare const _missingLabel: typeof missingLabel;
declare const _wrongLabel: typeof wrongLabel;
declare const _secretIsPrivate: typeof secretIsPrivate;
declare const _openPropsElement: typeof openPropsElement;
declare const _validThirdPartyButton: typeof validThirdPartyButton;
declare const _invalidThirdPartyButton: typeof invalidThirdPartyButton;
declare const _validFunctionComponent: typeof validFunctionComponent;
declare const _invalidFunctionComponent: typeof invalidFunctionComponent;
declare const _publicPropsAreInferred: PublicPropsAreInferred;

void [
	_validCounterCard,
	_missingLabel,
	_wrongLabel,
	_secretIsPrivate,
	_openPropsElement,
	_validThirdPartyButton,
	_invalidThirdPartyButton,
	_validFunctionComponent,
	_invalidFunctionComponent,
	_publicPropsAreInferred,
];
