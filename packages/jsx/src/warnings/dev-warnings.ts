export const DEV_WARNINGS_ENABLED_SYMBOL = Symbol.for('@ecopages/jsx.dev-warnings-enabled');
const DEV_WARNING_FORMATTER_SYMBOL = Symbol.for('@ecopages/jsx.dev-warning-formatter');

export const HYDRATION_INVALID_BINDING_INDEX_WARNING = 1;
export const HYDRATION_MALFORMED_BINDING_DESCRIPTOR_WARNING = 2;
export const HYDRATION_MISSING_BINDING_WARNING = 3;
export const DOM_RANGE_ANCHOR_DRIFT_WARNING = 4;
export const DETACHED_INSERTION_POINT_WARNING = 5;

const issuedRuntimeWarnings = new Set<string>();

type DevWarningKind =
	| typeof HYDRATION_INVALID_BINDING_INDEX_WARNING
	| typeof HYDRATION_MALFORMED_BINDING_DESCRIPTOR_WARNING
	| typeof HYDRATION_MISSING_BINDING_WARNING
	| typeof DOM_RANGE_ANCHOR_DRIFT_WARNING
	| typeof DETACHED_INSERTION_POINT_WARNING;

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
