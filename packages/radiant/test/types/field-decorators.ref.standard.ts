/**
 * `@ref` and `@refAll` forms that only standard decorators can check, because they depend on the
 * declared field type.
 *
 * @remarks
 * Typecheck only. Each `@ts-expect-error` row must fail, so an unused directive means the decorator
 * stopped checking the field type.
 */
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { ref, refAll } from '../../src/decorators/ref';

export class StandardRefElement extends RadiantElement {
	// @ts-expect-error a part can be missing, so the field must accept null
	@ref() r1!: HTMLElement;
	// @ts-expect-error not an element
	@ref() r2: string | null;
	// @ts-expect-error @ref is not an array
	@ref() r3: HTMLElement[];
	// @ts-expect-error the name form still needs a nullable field
	@ref('x') r4!: HTMLElement;
	// @ts-expect-error the options form still needs a nullable field
	@ref({ required: true }) r5!: HTMLElement;
	// @ts-expect-error the name and options form still needs a nullable field
	@ref('x', { required: true }) r6!: HTMLElement;

	// @ts-expect-error @refAll is an array, not a single element
	@refAll() a1!: HTMLElement;
	// @ts-expect-error @refAll is never null
	@refAll() a2: HTMLElement[] | null;
	// @ts-expect-error not an array of elements
	@refAll() a3: string[];
	// @ts-expect-error the name form still needs an array
	@refAll('x') a4!: HTMLElement;
	// @ts-expect-error the options form still needs an array
	@refAll({ required: true }) a5!: HTMLElement;
}

export class StandardRefController extends RadiantController {
	// @ts-expect-error a part can be missing, so the field must accept null
	@ref() r1!: HTMLElement;
	// @ts-expect-error @refAll is an array
	@refAll() a1!: HTMLElement;
}
