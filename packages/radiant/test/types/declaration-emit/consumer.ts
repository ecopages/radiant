/**
 * Shared decorators a consumer library exports, as `export const x = decorator(...)`.
 *
 * @remarks
 * Compiled with `declaration: true` by `check.mts`, which resolves the package through a
 * `node_modules` layout like an installed one. Every helper type a decorator's inferred type
 * names has to be reachable from a package `exports` entry, or the emit fails with TS2883.
 */
import { attr, bindTo, event, prop, query, querySlot, signal } from '@ecopages/radiant';
import { consumeContext, contextSelector, createContext, provideContext } from '@ecopages/radiant/context';

const ctx = createContext<{ n: number }>(Symbol('ctx'));

export const myProp = prop({ type: Number, defaultValue: 0 });
export const myAttr = attr({ type: Number, defaultValue: 0 });
export const mySignal = signal<number>({ initial: 0 });
export const myQuery = query({ selector: 'div' });
export const myQueryAll = query({ selector: 'div', all: true });
export const mySlot = querySlot();
export const mySlotAll = querySlot({ all: true });
export const myEvent = event({ name: 'x' });
export const myBind = bindTo<number>({ attr: 'data-n' });
export const myConsume = consumeContext(ctx);
export const myProvide = provideContext({ context: ctx, initialValue: { n: 0 } });
export const mySelector = contextSelector({ context: ctx, select: (c) => c.n });
