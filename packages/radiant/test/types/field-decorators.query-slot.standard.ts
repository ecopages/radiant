/**
 * `@querySlot` and `createQuerySlot` forms that only standard decorators can check,
 * because they depend on the declared field type.
 *
 * @remarks
 * Typecheck only. Each `@ts-expect-error` row must fail, so an unused directive
 * means the decorator stopped checking the field type. Forms that must compile in
 * both decorator modes live in `field-decorators.query-slot.ts`.
 */
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { querySlot } from '../../src/decorators/query-slot';
import { createQuerySlot } from '../../src/helpers/create-query-slot';

declare const host: RadiantElement;
declare const flag: boolean;

// @ts-expect-error a single-element slot query can be null
export const first: HTMLElement = createQuerySlot<HTMLElement>(host, {}).value;
// @ts-expect-error all: true returns an array
export const all: HTMLElement | null = createQuerySlot<HTMLElement>(host, { all: true }).value;
// @ts-expect-error the type argument is the element type
export const wholeResult = createQuerySlot<HTMLElement[]>(host, { all: true });
export const unknownAll: Element | Element[] | null = createQuerySlot(host, { all: flag }).value;

export class StandardSlotQueries extends RadiantElement {
	// @ts-expect-error a single-element slot query can be null
	@querySlot() s1!: HTMLParagraphElement;
	// @ts-expect-error an array needs all: true
	@querySlot() s2!: HTMLElement[];
	// @ts-expect-error all: true returns an array
	@querySlot({ all: true }) s3!: HTMLElement | null;
	// @ts-expect-error not an element
	@querySlot() s4!: string | null;
	// @ts-expect-error all picks the field type, so it must be a literal
	@querySlot({ all: flag }) s5!: HTMLElement | null;
	// @ts-expect-error the type argument is the element type
	@querySlot<HTMLElement[]>({ all: true }) s6!: HTMLElement[];
}

export class StandardControllerSlotQueries extends RadiantController {
	// @ts-expect-error slot queries need a RadiantElement host
	@querySlot() s1!: HTMLElement | null;
}
