import type { JsxElementProps, SignalLike, StylePropertyValue } from '../../src/index.ts';

type Assert<T extends true> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;

type ObjectStyleSignal = SignalLike<Record<string, StylePropertyValue>>;

type ReactiveObjectStyleAccepted = Assert<
	IsAssignable<{ style: ObjectStyleSignal }, Pick<JsxElementProps, 'style'>>
>;
type DirectHostAttributesAccepted = Assert<
	IsAssignable<{ 'aria-label': string; 'data-state': string }, Pick<JsxElementProps, 'aria-label' | 'data-state'>>
>;

declare const _reactiveObjectStyleAccepted: ReactiveObjectStyleAccepted;
declare const _directHostAttributesAccepted: DirectHostAttributesAccepted;

void _reactiveObjectStyleAccepted;
void _directHostAttributesAccepted;
