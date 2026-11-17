import { areJsxDevWarningsEnabled, warnOnceInDevelopment } from '../../helpers/dev-warnings';

const ownerIds = new WeakMap<object, number>();
let nextOwnerId = 0;

function ownerKey(owner: object): number {
	let id = ownerIds.get(owner);

	if (id === undefined) {
		id = ++nextOwnerId;
		ownerIds.set(owner, id);
	}

	return id;
}

/**
 * Warns in development that a `@prop` declares both a field initializer and a different `defaultValue`.
 *
 * @remarks
 * The `defaultValue` wins and the initializer is ignored, so the two cannot both be intended. Values that
 * serialize to the same JSON are the same value (`defaultValue: []` with `= []`). Fires once per class
 * object and prop, from both decorator modes, so two unrelated classes that share a name each get their own.
 * The `try` keeps an unbundled browser load, where `process` does not exist, from throwing.
 *
 * @param declaringHint The class whose initializer was ignored (legacy decorators: the constructed class, since a
 * subclass can override the field), or the decorator metadata object of the declaring class (standard decorators,
 * where the initializer always sits with the decorator), from which the class is found on `host`'s chain.
 */
export function warnInitializerWithDefaultValue(
	host: object,
	propertyName: string,
	initializerValue: unknown,
	defaultValue: unknown,
	declaringHint: Function | object | null | undefined,
): void {
	try {
		if (
			process.env.NODE_ENV !== 'production' &&
			areJsxDevWarningsEnabled() &&
			initializerValue !== undefined &&
			defaultValue !== undefined &&
			!isSameValue(initializerValue, defaultValue)
		) {
			const owner = typeof declaringHint === 'function' ? declaringHint : declaringClass(host, declaringHint);
			warnOnceInDevelopment(
				`${ownerKey(owner)}:${propertyName}:initializer-default`,
				() =>
					`[@ecopages/radiant] "${propertyName}" on ${owner.name} has both a field initializer and a different defaultValue: the defaultValue wins and the initializer is ignored. Set an initializer or defaultValue, not both.`,
			);
		}
	} catch {}
}

/**
 * Warns in development that a `@fromStore` field has a field initializer, which the store snapshot replaces.
 *
 * @remarks Fires once per class object and field, from both decorator modes, under the same rules as
 * {@link warnInitializerWithDefaultValue}, whose `declaringHint` this takes.
 */
export function warnInitializerOnStoreField(
	host: object,
	propertyName: string,
	initializerValue: unknown,
	declaringHint: Function | object | null | undefined,
): void {
	try {
		if (process.env.NODE_ENV !== 'production' && areJsxDevWarningsEnabled() && initializerValue !== undefined) {
			const owner = typeof declaringHint === 'function' ? declaringHint : declaringClass(host, declaringHint);
			warnOnceInDevelopment(
				`${ownerKey(owner)}:${propertyName}:initializer-store`,
				() =>
					`[@ecopages/radiant] "${propertyName}" on ${owner.name} has a field initializer, but @fromStore reads its value from the store: the initializer is ignored. Remove it.`,
			);
		}
	} catch {}
}

function isSameValue(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) {
		return true;
	}

	if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
		return false;
	}

	try {
		return JSON.stringify(a) === JSON.stringify(b);
	} catch {
		return false;
	}
}

const METADATA_KEY: symbol = (Symbol as { metadata?: symbol }).metadata ?? Symbol.for('Symbol.metadata');

/**
 * Finds the class on `host`'s chain whose own decorator metadata is `metadata`, so a prop is attributed to the class
 * that declares it rather than the most derived one. Falls back to the host's constructor when the runtime attaches
 * no metadata.
 */
function declaringClass(host: object, metadata: object | null | undefined): Function {
	for (
		let prototype = Object.getPrototypeOf(host);
		prototype && prototype !== Object.prototype;
		prototype = Object.getPrototypeOf(prototype)
	) {
		const constructor = Object.getOwnPropertyDescriptor(prototype, 'constructor')?.value as Function | undefined;

		if (constructor && metadata && Object.getOwnPropertyDescriptor(constructor, METADATA_KEY)?.value === metadata) {
			return constructor;
		}
	}

	return host.constructor;
}
