import { fieldDecorator, type ValueFieldDecorator } from './bridge';
import { ref as legacyRef } from './legacy/ref';
import { createRefConfig, type RefDecoratorHost, type RefOptions } from './shared/ref';
import { ref as standardRef } from './standard/ref';

export type { RefDecoratorHost, RefOptions };

/**
 * A decorator that reads the part this host owns, the first `data-ref` match in document order, or `null`.
 *
 * Without a name the part name is the field name converted like a `@prop` attribute name: `menubarRoot`
 * finds `data-ref="menubar-root"`, `listboxID` finds `listbox-id`. A given name is used exactly as written.
 * The value is read live on every access: `null` while no owned part exists, including before connect, and the
 * part itself when it is already in the markup. Under standard decorators the field must accept `null`.
 *
 * @remarks
 * Scoped: a part inside a nested Element Host or Controller Host belongs to that host, not to this one.
 * Use `@query(selector)` to reach into another host. Development warnings: `{ required: true }` warns once
 * per class and field when no part is found after the first connect, and more than one part under the same
 * name in this scope warns once per class and field, on first connect. Not supported on a `#private` field
 * under standard decorators, which cannot hold a getter; use a TypeScript `private` field. Under legacy
 * decorators a `RadiantController` field is set up at `connect()` and reads `undefined` before it, as
 * `@query` does.
 */
export function ref<T extends Element = Element>(): ValueFieldDecorator<RefDecoratorHost, T | null>;
export function ref<T extends Element = Element>(name: string): ValueFieldDecorator<RefDecoratorHost, T | null>;
export function ref<T extends Element = Element>(options: RefOptions): ValueFieldDecorator<RefDecoratorHost, T | null>;
export function ref<T extends Element = Element>(
	name: string,
	options: RefOptions,
): ValueFieldDecorator<RefDecoratorHost, T | null>;
export function ref<T extends Element = Element>(
	nameOrOptions?: string | RefOptions,
	options?: RefOptions,
): ValueFieldDecorator<RefDecoratorHost, T | null> {
	const config = createRefConfig(false, nameOrOptions, options);
	return fieldDecorator<RefDecoratorHost, T | null>(standardRef(config), legacyRef(config));
}

/**
 * A decorator that reads every part this host owns under a name, in document order, as an array on every
 * access. The field is `[]` before connect and when nothing matches, and under standard decorators it must
 * be an array of elements.
 *
 * @remarks
 * Same name rule and scope as {@link ref}: parts inside nested hosts are left out. Several parts under one
 * name are expected here, so there is no duplicate warning; `{ required: true }` warns once when none are found.
 */
export function refAll<T extends Element = Element>(): ValueFieldDecorator<RefDecoratorHost, T[]>;
export function refAll<T extends Element = Element>(name: string): ValueFieldDecorator<RefDecoratorHost, T[]>;
export function refAll<T extends Element = Element>(options: RefOptions): ValueFieldDecorator<RefDecoratorHost, T[]>;
export function refAll<T extends Element = Element>(
	name: string,
	options: RefOptions,
): ValueFieldDecorator<RefDecoratorHost, T[]>;
export function refAll<T extends Element = Element>(
	nameOrOptions?: string | RefOptions,
	options?: RefOptions,
): ValueFieldDecorator<RefDecoratorHost, T[]> {
	const config = createRefConfig(true, nameOrOptions, options);
	return fieldDecorator<RefDecoratorHost, T[]>(standardRef(config), legacyRef(config));
}
