import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import type { ReactiveState, ReadonlyReactiveState } from '../../src/core/reactivity-contract';

type Assert<Value extends true> = Value;

export type WritableStateIsAssignableToReadonly = Assert<
	ReactiveState<number> extends ReadonlyReactiveState<number> ? true : false
>;
export type ReadonlyStateIsNotWritable = Assert<
	ReadonlyReactiveState<number> extends ReactiveState<number> ? false : true
>;

declare const element: RadiantElement;
declare const controller: RadiantController;
declare const readonlyState: ReadonlyReactiveState<number>;
declare const writableState: ReactiveState<number>;

element.registerReactiveMember('count', readonlyState);
element.registerReactiveMember('count', writableState);
controller.registerReactiveMember('count', readonlyState);

export const elementMember = element.getReactiveMember<number>('count');
export const controllerMember = controller.getReactiveMember<number>('count');

// @ts-expect-error getReactiveMember returns the read-only view
elementMember?.set(1);
// @ts-expect-error getReactiveMember returns the read-only view
controllerMember?.set(1);
