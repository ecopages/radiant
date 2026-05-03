import {
	DEV_WARNINGS_ENABLED_SYMBOL,
	DOM_RANGE_ANCHOR_DRIFT_WARNING,
	DETACHED_INSERTION_POINT_WARNING,
	HYDRATION_INVALID_BINDING_INDEX_WARNING,
	HYDRATION_MALFORMED_BINDING_DESCRIPTOR_WARNING,
	HYDRATION_MISSING_BINDING_WARNING,
	installDevWarningFormatter,
	resetRuntimeWarningsForTests,
} from './dev-warnings.ts';

export { resetRuntimeWarningsForTests };

export function areDevWarningsEnabled(): boolean {
	const globalScope = globalThis as typeof globalThis & Record<PropertyKey, unknown>;
	return globalScope[DEV_WARNINGS_ENABLED_SYMBOL] !== false;
}

export function setDevWarningsEnabled(enabled: boolean | undefined): void {
	const globalScope = globalThis as typeof globalThis & Record<PropertyKey, unknown>;

	if (typeof enabled === 'undefined') {
		delete globalScope[DEV_WARNINGS_ENABLED_SYMBOL];
		return;
	}

	globalScope[DEV_WARNINGS_ENABLED_SYMBOL] = enabled;
}

const HYDRATION_INVALID_BINDING_INDEX_WARNING_PREFIX = 'Ignored hydration marker with invalid binding index';
const HYDRATION_MALFORMED_BINDING_DESCRIPTOR_WARNING_PREFIX = 'Ignored malformed hydration binding descriptor';
const HYDRATION_MISSING_BINDING_WARNING_PREFIX = 'Ignored hydration marker without a matching binding value';
const DOM_RANGE_ANCHOR_DRIFT_WARNING_PREFIX = 'A renderer-managed DOM range was mutated outside Radiant JSX control';
const DETACHED_INSERTION_POINT_WARNING_MESSAGE =
	'A renderer-managed insertion point was detached before insertNodesBefore ran.';

export function installDefaultDevWarningFormatter(): void {
	installDevWarningFormatter((kind, detail) => {
		switch (kind) {
			case HYDRATION_INVALID_BINDING_INDEX_WARNING:
				return `${HYDRATION_INVALID_BINDING_INDEX_WARNING_PREFIX}: ${detail ?? ''}`;

			case HYDRATION_MALFORMED_BINDING_DESCRIPTOR_WARNING:
				return `${HYDRATION_MALFORMED_BINDING_DESCRIPTOR_WARNING_PREFIX}: ${detail ?? ''}`;

			case HYDRATION_MISSING_BINDING_WARNING:
				return `${HYDRATION_MISSING_BINDING_WARNING_PREFIX}: ${detail ?? ''}`;

			case DOM_RANGE_ANCHOR_DRIFT_WARNING:
				return `${DOM_RANGE_ANCHOR_DRIFT_WARNING_PREFIX} before ${detail ?? 'an unknown operation'} ran.`;

			case DETACHED_INSERTION_POINT_WARNING:
				return DETACHED_INSERTION_POINT_WARNING_MESSAGE;

			default:
				return '';
		}
	});
}
