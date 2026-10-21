/**
 * Installer decorator forms that only standard decorators can check, because they
 * depend on the declared field type.
 *
 * @remarks
 * Typecheck only. Each `@ts-expect-error` row must fail, so an unused directive
 * means the decorator stopped checking the field type. Forms that must compile in
 * both decorator modes live in `field-decorators.installers.ts`.
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

const ctxA = createContext<{ count: number }>('a');
const ctxB = createContext<{ name: string }>('b');

declare const host: Element;
declare const flag: boolean;

// @ts-expect-error a single-element query can be null
export const item: HTMLElement = createQuery<HTMLElement>(host, { ref: 'r' }).value;
// @ts-expect-error all: true returns an array
export const items: HTMLElement | null = createQuery<HTMLElement>(host, { ref: 'r', all: true }).value;

export class StandardElementInstallers extends RadiantElement {
	// @ts-expect-error a single-element query can be null
	@query({ ref: 'r' }) q1: HTMLElement;
	// @ts-expect-error not an element
	@query({ ref: 'r' }) q2: string | null;
	// @ts-expect-error an array needs all: true
	@query({ ref: 'r' }) q3: HTMLElement[];
	// @ts-expect-error all: true returns an array
	@query({ ref: 'r', all: true }) q4: HTMLElement | null;
	// @ts-expect-error all picks the field type, so it must be a literal
	@query({ ref: 'r', all: flag }) q5: HTMLElement | null;

	// @ts-expect-error not an element
	@querySlot() s1!: string;

	// @ts-expect-error the decorator installs an EventEmitter
	@event({ name: 'x' }) e1: string;

	// @ts-expect-error the provider is for ctxA
	@consumeContext(ctxA) c1!: ContextProvider<typeof ctxB>;

	// @ts-expect-error the provider is for ctxA
	@provideContext({ context: ctxA }) p1!: ContextProvider<typeof ctxB>;

	// @ts-expect-error select returns a number
	@contextSelector({ context: ctxA, select: (c) => c.count }) x1!: string;
}

export class StandardControllerInstallers extends RadiantController {
	// @ts-expect-error slot queries need a RadiantElement host
	@querySlot() s1!: HTMLElement | null;

	// @ts-expect-error a single-element query can be null
	@query({ ref: 'r' }) q1: HTMLElement;
}
