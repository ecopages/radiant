export const DEV_WARNINGS_ENABLED_SYMBOL = Symbol.for('@ecopages/jsx.dev-warnings-enabled');
const DEV_WARNING_FORMATTER_SYMBOL = Symbol.for('@ecopages/jsx.dev-warning-formatter');

export const HYDRATION_INVALID_BINDING_INDEX_WARNING = 1;
export const HYDRATION_MALFORMED_BINDING_DESCRIPTOR_WARNING = 2;
export const HYDRATION_MISSING_BINDING_WARNING = 3;
export const DOM_RANGE_ANCHOR_DRIFT_WARNING = 4;
export const DETACHED_INSERTION_POINT_WARNING = 5;
export const CLASS_NAME_ATTRIBUTE_WARNING = 6;
export const FUNCTION_POSITION_WARNING = 7;

const issuedRuntimeWarnings = new Set<string>();

type DevWarningKind =
	| typeof HYDRATION_INVALID_BINDING_INDEX_WARNING
	| typeof HYDRATION_MALFORMED_BINDING_DESCRIPTOR_WARNING
	| typeof HYDRATION_MISSING_BINDING_WARNING
	| typeof DOM_RANGE_ANCHOR_DRIFT_WARNING
	| typeof DETACHED_INSERTION_POINT_WARNING
	| typeof CLASS_NAME_ATTRIBUTE_WARNING
	| typeof FUNCTION_POSITION_WARNING;

type DevWarningFormatter = (kind: DevWarningKind, detail?: string) => string;

type DevWarningOptions = {
	code?: string;
	once?: boolean;
};

export function installDevWarningFormatter(formatter: DevWarningFormatter | undefined): void {
	const globalScope = globalThis as typeof globalThis & Record<PropertyKey, unknown>;

	if (typeof formatter === 'undefined') {
		delete globalScope[DEV_WARNING_FORMATTER_SYMBOL];
		return;
	}

	globalScope[DEV_WARNING_FORMATTER_SYMBOL] = formatter;
}

function getDevWarningFormatter(): DevWarningFormatter | undefined {
	const globalScope = globalThis as typeof globalThis & Record<PropertyKey, unknown>;
	const formatter = globalScope[DEV_WARNING_FORMATTER_SYMBOL];

	if (typeof formatter !== 'function') {
		return undefined;
	}

	return formatter as DevWarningFormatter;
}

export function warnRuntime(kind: DevWarningKind, detail: string | undefined, options?: DevWarningOptions): void;
export function warnRuntime(kind: DevWarningKind, detail: string | undefined, options: DevWarningOptions = {}): void {
	const globalScope = globalThis as typeof globalThis & Record<PropertyKey, unknown>;

	if (globalScope[DEV_WARNINGS_ENABLED_SYMBOL] === false) {
		return;
	}

	const message = getDevWarningFormatter()?.(kind, detail);

	if (!message) {
		return;
	}

	const once = options.once !== false;
	const warningKey = options.code ?? message;

	if (once) {
		if (issuedRuntimeWarnings.has(warningKey)) {
			return;
		}

		issuedRuntimeWarnings.add(warningKey);
	}

	console.warn(`[Radiant JSX] ${message}`);
}

export function resetRuntimeWarningsForTests(): void {
	issuedRuntimeWarnings.clear();
}

/** Warns once per `position` that a function there is skipped rather than written out as text. */
export function warnFunctionPosition(position: string): void {
	warnRuntime(FUNCTION_POSITION_WARNING, position, { code: `function-position:${position}` });
}

/**
 * Returns `true`, after warning, when `value` is a function that a text or attribute sink must render as nothing.
 *
 * @remarks Literal functions are skipped when the element is created. This covers one that a signal or subscribable
 * resolves to, which only the renderer sees.
 */
export function isSkippedFunction(value: unknown, position: string): boolean {
	if (typeof value !== 'function') return false;
	warnFunctionPosition(position);
	return true;
}

/**
 * Returns `true` when a child value renders as nothing: `null`, `undefined`, a boolean, or a function, which is
 * skipped with a dev warning.
 *
 * @remarks Mount, hydration and server rendering share this one test, so a function child counts as no nodes in all of them. Testing a
 * function child also warns once in development, so the check is not free of side effects.
 */
export function isEmptyChild(value: unknown): boolean {
	return value == null || typeof value === 'boolean' || isSkippedFunction(value, 'a child');
}
