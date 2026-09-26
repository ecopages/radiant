import { applyBindToTargets, type BindToHost, type CompiledBindToTarget } from '../shared/bind-to';
import { REACTIVE_HOST } from '../../core/reactive-host';
import { registerLegacyInstanceInitializer } from './instance-initializers';

export function bindTo(targets: readonly CompiledBindToTarget[]) {
	return (proto: BindToHost, propertyName: string) => {
		registerLegacyInstanceInitializer(proto, (element) => {
			const apply = () => applyBindToTargets(element, propertyName, targets);
			element.registerUpdateCallback(propertyName, apply);
			element[REACTIVE_HOST].registerPostSyncCallback(apply);
		});
	};
}
