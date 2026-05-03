export const CONTROLLER_IDENTIFIER = Symbol.for('@ecopages/radiant.controllerIdentifier');

type ControllerConstructorWithMetadata = CustomElementConstructor & {
	[CONTROLLER_IDENTIFIER]?: string;
};

export function setControllerIdentifier(target: CustomElementConstructor, identifier: string): void {
	(target as ControllerConstructorWithMetadata)[CONTROLLER_IDENTIFIER] = identifier;
}

export function getControllerIdentifier(target: CustomElementConstructor): string | undefined {
	return (target as ControllerConstructorWithMetadata)[CONTROLLER_IDENTIFIER];
}
