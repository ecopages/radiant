import { applyBindToTargets, type BindToHost, type CompiledBindToTarget } from '../shared/bind-to';
import { registerLegacyInstanceInitializer } from './instance-initializers';

export function bindTo(targets: readonly CompiledBindToTarget[]) {
	return (proto: BindToHost, propertyName: string) => {
		registerLegacyInstanceInitializer(proto, (element) => {
			const apply = () => applyBindToTargets(element, propertyName, targets);
			element.registerUpdateCallback(propertyName, apply);
			element.registerPostSyncCallback(apply);
		});
	};
}
