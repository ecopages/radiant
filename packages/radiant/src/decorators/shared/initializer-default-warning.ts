import { areJsxDevWarningsEnabled, warnOnceInDevelopment } from '../../helpers/dev-warnings';

/**
 * Warns in development that a `@prop` declares both a field initializer and a different `defaultValue`.
 *
 * @remarks
 * The `defaultValue` wins and the initializer is ignored, so the two cannot both be intended. Values that
 * serialize to the same JSON are the same value (`defaultValue: []` with `= []`). Fires once per owning class
 * and prop, from both decorator modes. The check wraps the warning instead of returning early, because some
 * bundlers (Rollup) keep the code after an early `return` inside a `try`; the `try` keeps an unbundled browser
 * load, where `process` does not exist, from throwing.
 */
export function warnInitializerWithDefaultValue(
	host: object,
	propertyName: string,
	initializerValue: unknown,
	defaultValue: unknown,
): void {
	try {
		if (process.env.NODE_ENV !== 'production' && areJsxDevWarningsEnabled()) {
			if (
				initializerValue === undefined ||
				defaultValue === undefined ||
				isSameValue(initializerValue, defaultValue)
			) {
				return;
			}

			const owner = host.constructor.name;
			warnOnceInDevelopment(
				`${owner}:${propertyName}:initializer-default`,
				() =>
					`[@ecopages/radiant] "${propertyName}" on ${owner} has both a field initializer and a different defaultValue: the defaultValue wins and the initializer is ignored. Set an initializer or defaultValue, not both.`,
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
