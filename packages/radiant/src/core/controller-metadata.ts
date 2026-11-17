export const CONTROLLER_IDENTIFIER = Symbol.for('@ecopages/radiant.controllerIdentifier');

/**
 * Stores the identifier on any class a controller registration names.
 *
 * @remarks A hydration payload of a controller is keyed `<identifier>:<field>` (see `resolveHydrationKey`), so a
 * `:` in the identifier would make the key ambiguous to read. Throws as well when the class refuses the write, for
 * example a frozen one, rather than leaving the controller without an identifier.
 */
export function setControllerIdentifier(target: object, identifier: string): void {
	if (identifier.includes(':')) {
		throw new Error(`[@ecopages/radiant] Controller identifier "${identifier}" must not contain ":".`);
	}

	if (!Reflect.set(target, CONTROLLER_IDENTIFIER, identifier)) {
		throw new Error(`[@ecopages/radiant] Controller identifier "${identifier}" could not be stored on its class.`);
	}
}

/** The identifier a controller class, or a class it extends, was registered under. */
export function getControllerIdentifier(target: object): string | undefined {
	const identifier: unknown = Reflect.get(target, CONTROLLER_IDENTIFIER);

	return typeof identifier === 'string' ? identifier : undefined;
}
