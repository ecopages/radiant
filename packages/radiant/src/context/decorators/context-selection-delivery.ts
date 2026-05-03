import { SSR_PREPARATION_RUNNING } from '../../core/ssr-preparation';

type RequestUpdateCapable = {
	requestUpdate(): void;
};

export function createContextSelectionDelivery(host: object, apply: (value: unknown) => void, requestUpdate: boolean) {
	let hasDeliveredValue = false;
	let previousValue: unknown;
	const target = host as Record<PropertyKey, unknown>;

	return (value: unknown) => {
		if (target[SSR_PREPARATION_RUNNING] !== true && hasDeliveredValue && Object.is(previousValue, value)) {
			return;
		}

		hasDeliveredValue = true;
		previousValue = value;
		apply(value);

		if (requestUpdate && typeof target.requestUpdate === 'function') {
			(target as RequestUpdateCapable).requestUpdate();
		}
	};
}
