type RequestUpdateCapable = {
	requestUpdate(): void;
};

export function createContextSelectionDelivery<Value>(
	host: object,
	apply: (value: Value) => void,
	requestUpdate: boolean,
) {
	let hasDeliveredValue = false;
	let previousValue: Value;
	const target = host as Record<PropertyKey, unknown>;

	return (value: Value) => {
		if (hasDeliveredValue && Object.is(previousValue, value)) {
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
