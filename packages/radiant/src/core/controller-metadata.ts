export const CONTROLLER_IDENTIFIER = Symbol.for('@ecopages/radiant.controllerIdentifier');

export function setControllerIdentifier(target: object, identifier: string): void {
	Reflect.set(target, CONTROLLER_IDENTIFIER, identifier);
}

/** The identifier a controller class, or a class it extends, was registered under. */
export function getControllerIdentifier(target: object): string | undefined {
	const identifier: unknown = Reflect.get(target, CONTROLLER_IDENTIFIER);

	return typeof identifier === 'string' ? identifier : undefined;
}
