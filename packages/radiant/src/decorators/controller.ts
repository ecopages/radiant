import { registerControllerWithConfiguredStrategy, type ControllerConstructor } from '../controller-registry';

export function controller(identifier: string) {
	return function <T extends ControllerConstructor>(target: T): T {
		return registerControllerWithConfiguredStrategy(identifier, target);
	};
}
