/**
 * `@querySlot` and `createQuerySlot` forms that must compile with no explicit generic.
 *
 * @remarks
 * Typecheck only: `tsconfig.json` checks this file with standard decorators and
 * `test/types/tsconfig.legacy.json` checks it with legacy decorators. The forms
 * `@querySlot` must reject live in `field-decorators.query-slot.standard.ts`, because
 * legacy mode never sees the field type.
 */
import { RadiantElement } from '../../src/core/radiant-element';
import { querySlot } from '../../src/decorators/query-slot';
import { createQuerySlot } from '../../src/helpers/create-query-slot';

declare const host: RadiantElement;

export const first: HTMLElement | null = createQuerySlot<HTMLElement>(host, { name: 'header' }).value;
export const inferred: Element | null = createQuerySlot(host).value;
export const all: HTMLLIElement[] = createQuerySlot<HTMLLIElement>(host, { all: true }).value;
export const explicitFalse: HTMLElement | null = createQuerySlot<HTMLElement>(host, { all: false }).value;

export class ValidSlotQueries extends RadiantElement {
	@querySlot() s1!: HTMLParagraphElement | null;
	@querySlot({ name: 'header' }) s2: HTMLElement | null;
	@querySlot({ all: true }) s3!: HTMLLIElement[];
	@querySlot({ name: 'header', all: false }) s4!: HTMLElement | null;
	@querySlot<HTMLHeadingElement>({ name: 'header' }) s5!: HTMLHeadingElement | null;
	@querySlot<HTMLLIElement>({ all: true }) s6!: HTMLLIElement[];
}
