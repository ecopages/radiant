import { registerControllerWithConfiguredStrategy, type ControllerConstructor } from '../controller-registry';
import { withLegacyConstructionEnd } from './legacy/host-readiness';
import { hasLegacyPostConstructionInitializers } from './legacy/instance-initializers';

/**
 * Registers a controller under `identifier`.
 *
 * @remarks Under the legacy decorators a class that has legacy member decorators is wrapped so its `@prop` setup
 * runs when its constructor ends, as `@customElement` does for an element: a field initializer is then told
 * apart from a later write. The decorated class is then the wrapper, not the class passed in. The standard
 * decorators set each prop up as its field initializes and need no wrapper, and a class with no legacy member
 * decorators has nothing to set up.
 */
export function controller(identifier: string) {
	return function <T extends ControllerConstructor>(target: T, context?: ClassDecoratorContext): T {
		const registered =
			context || !hasLegacyPostConstructionInitializers(target) ? target : withLegacyConstructionEnd(target);

		return registerControllerWithConfiguredStrategy(identifier, registered);
	};
}
