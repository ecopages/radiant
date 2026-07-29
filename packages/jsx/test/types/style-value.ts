import type { JsxHtmlProps, SignalLike, StylePropertyValue } from '../../src/index.ts';

type Assert<T extends true> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;

type ObjectStyleSignal = SignalLike<Record<string, StylePropertyValue>>;

type ReactiveObjectStyleAccepted = Assert<IsAssignable<{ style: ObjectStyleSignal }, Pick<JsxHtmlProps, 'style'>>>;

declare const _reactiveObjectStyleAccepted: ReactiveObjectStyleAccepted;

void _reactiveObjectStyleAccepted;
