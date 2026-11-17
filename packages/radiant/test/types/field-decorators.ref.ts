/**
 * `@ref` and `@refAll` forms that must compile in both decorator modes.
 *
 * @remarks
 * Typecheck only. The forms that depend on the declared field type, and so can only be rejected by
 * standard decorators, live in `field-decorators.ref.standard.ts`.
 */
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { ref, refAll } from '../../src/decorators/ref';

export class ValidRefElement extends RadiantElement {
	@ref() menubarRoot: HTMLElement | null;
	@ref() panel!: HTMLButtonElement | null;
	@ref<HTMLButtonElement>() trigger!: HTMLButtonElement | null;
	@ref('l1234') specialProduct: HTMLElement | null;
	@ref({ required: true }) status: Element | null;
	@ref('named', { required: true }) named!: HTMLElement | null;
	@refAll() items: HTMLLIElement[];
	@refAll<HTMLLIElement>('row') rows!: HTMLLIElement[];
	@refAll({ required: false }) cells: HTMLElement[];
	@refAll('cell', { required: true }) namedCells!: HTMLElement[];
}

export class ValidRefController extends RadiantController {
	@ref() status!: HTMLElement | null;
	@refAll() items!: HTMLElement[];
}
