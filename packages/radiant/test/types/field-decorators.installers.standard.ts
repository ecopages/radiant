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
import { ContextProvider } from '../../src/context/context-provider';
import { createContext } from '../../src/context/create-context';
import { consumeContext } from '../../src/context/decorators/consume-context';
import { contextSelector } from '../../src/context/decorators/context-selector';
import { provideContext } from '../../src/context/decorators/provide-context';
import { event } from '../../src/decorators/event';
import { query, queryAll } from '../../src/decorators/query';
import { createQuery, createQueryAll } from '../../src/helpers/create-query';

const ctxA = createContext<{ count: number }>('a');
const ctxB = createContext<{ name: string }>('b');

declare const host: Element;

// @ts-expect-error a single-element query can be null
export const itemBySelector: HTMLElement = createQuery<HTMLElement>(host, 'li').value;
// @ts-expect-error createQueryAll returns an array
export const itemsBySelector: HTMLElement = createQueryAll<HTMLElement>(host, 'li').value;

export class StandardElementInstallers extends RadiantElement {
	// @ts-expect-error a single-element query can be null
	@query('.r') s1!: HTMLElement;
	// @ts-expect-error not an element
	@query('.r') s2: string | null;
	// @ts-expect-error @query(selector) is not an array
	@query('.r') s3: HTMLElement[];
	// @ts-expect-error @queryAll is an array, not a single element
	@queryAll('.r') s4!: HTMLElement;
	// @ts-expect-error @queryAll is never null
	@queryAll('.r') s5: HTMLElement[] | null;
	// @ts-expect-error not an array of elements
	@queryAll('.r') s6: string[];
	// @ts-expect-error the type argument names the element the field holds
	@query<HTMLButtonElement>('button') s7!: HTMLInputElement | null;
	// @ts-expect-error the type argument names the element the field holds
	@queryAll<HTMLButtonElement>('button') s8!: HTMLInputElement[];
	// @ts-expect-error the selector is a string
	@query(1) s9!: HTMLElement | null;
	// @ts-expect-error the selector is a string
	@queryAll({ selector: '.r' }) s10!: HTMLElement[];

	// @ts-expect-error the decorator installs an EventEmitter
	@event({ name: 'x' }) e1: string;

	// @ts-expect-error the provider is for ctxA
	@consumeContext(ctxA) c1!: ContextProvider<typeof ctxB>;

	// @ts-expect-error the provider is for ctxA
	@provideContext({ context: ctxA }) p1!: ContextProvider<typeof ctxB>;

	// @ts-expect-error select returns a number
	@contextSelector({ context: ctxA, select: (c) => c.count }) x1!: string;

	// @ts-expect-error the field must hold any number, not only 1
	@contextSelector({ context: ctxA, select: (c) => c.count }) x2?: 1;
	// @ts-expect-error the field must hold any number
	@contextSelector({ context: ctxA, select: (c) => c.count }) x3?: never;
	// @ts-expect-error the field must hold the whole context value, not only { count: 1 }
	@contextSelector({ context: ctxA }) x4!: { count: 1 };
	// @ts-expect-error a field of another type cannot hold the whole context value
	@contextSelector({ context: ctxA }) x5!: string;
	// @ts-expect-error a subclass of the provider is not what the decorator installs
	@consumeContext(ctxA) c2!: SubProvider;
	// @ts-expect-error a subclass of the provider is not what the decorator installs
	@provideContext({ context: ctxA }) p2!: SubProvider;
}

class SubProvider extends ContextProvider<typeof ctxA> {
	extra = 1;
}

/** A field typed by the host's own type parameter holds what the selection returns. */
export class StandardGenericSelector<T extends number> extends RadiantElement {
	@contextSelector({ context: ctxA, select: (c) => c.count as T }) g1?: T;
	@contextSelector({ context: ctxA, select: (c) => c.count as T }) g2!: T | string;
	// @ts-expect-error T may be narrower than number, so the field cannot hold the selected number
	@contextSelector({ context: ctxA, select: (c) => c.count }) g3?: T;
}

export class StandardControllerInstallers extends RadiantController {
	// @ts-expect-error a single-element query can be null
	@query('.r') q1: HTMLElement;
}
