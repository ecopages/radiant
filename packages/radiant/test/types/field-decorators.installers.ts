/**
 * Installer decorator forms that must compile with no explicit generic.
 *
 * @remarks
 * Typecheck only: `tsconfig.json` checks this file with standard decorators and
 * `test/types/tsconfig.legacy.json` checks it with legacy decorators. An installer
 * decorator assigns a value the user does not supply, so the field may declare any
 * type that value satisfies. The forms each decorator must reject live in
 * `field-decorators.installers.standard.ts`, because legacy mode never sees the
 * field type.
 */
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import type { ContextProvider } from '../../src/context/context-provider';
import { createContext } from '../../src/context/create-context';
import { consumeContext } from '../../src/context/decorators/consume-context';
import { contextSelector } from '../../src/context/decorators/context-selector';
import { provideContext } from '../../src/context/decorators/provide-context';
import { event } from '../../src/decorators/event';
import { query } from '../../src/decorators/query';
import { querySlot } from '../../src/decorators/query-slot';
import { createQuery } from '../../src/helpers/create-query';
import type { EventEmitter } from '../../src/tools/event-emitter';

const ctxA = createContext<{ count: number }>('a');

declare const host: Element;

export const item: HTMLLIElement | null = createQuery<HTMLLIElement>(host, { ref: 'r' }).value;
export const items: HTMLLIElement[] = createQuery<HTMLLIElement>(host, { ref: 'r', all: true }).value;

export class ValidElementInstallers extends RadiantElement {
	@query({ ref: 'r' }) q1: HTMLElement | null;
	@query({ ref: 'r' }) q2!: HTMLButtonElement | null;
	@query({ selector: '.r' }) q3: Element | null;
	@query({ ref: 'r', all: true }) q4: HTMLLIElement[];
	@query({ ref: 'r', all: false }) q5: HTMLElement | null;

	@querySlot() s1!: HTMLParagraphElement | null;
	@querySlot({ all: true }) s2!: HTMLElement[];

	@event({ name: 'x' }) e1: EventEmitter<{ a: number }>;
	@event({ name: 'x' }) e2!: EventEmitter;

	@consumeContext(ctxA) c1?: ContextProvider<typeof ctxA>;
	@consumeContext(ctxA) c2!: ContextProvider<typeof ctxA>;

	@provideContext({ context: ctxA, initialValue: { count: 0 } }) p1!: ContextProvider<typeof ctxA>;
	@provideContext({ context: ctxA }) p2!: ContextProvider<typeof ctxA>;

	@contextSelector({ context: ctxA, select: (c) => c.count }) x1?: number;
	@contextSelector({ context: ctxA, select: (c) => c.count }) x2 = 0;
	@contextSelector({ context: ctxA }) x3!: { count: number };
}

export class ValidControllerInstallers extends RadiantController {
	@query({ ref: 'r' }) q1: HTMLElement | null;
	@query({ ref: 'r', all: true }) q2: HTMLLIElement[];

	@consumeContext(ctxA) c1?: ContextProvider<typeof ctxA>;

	@contextSelector({ context: ctxA, select: (c) => c.count }) x1?: number;
}
