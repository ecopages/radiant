import type {
	LegacyFieldDecoratorArgs,
	LegacyMethodDecoratorArgs,
	StandardMethodDecoratorArgs,
	StandardOrLegacyFieldDecoratorArgs,
	StandardOrLegacyMethodDecoratorArgs,
} from '../types';

type StandardFieldFn = (target: undefined, context: ClassFieldDecoratorContext<any, any>) => any;

type LegacyFieldFn = (
	proto: LegacyFieldDecoratorArgs['protoOrTarget'],
	name: LegacyFieldDecoratorArgs['nameOrContext'],
) => any;

type StandardMethodFn = (
	target: StandardMethodDecoratorArgs['protoOrTarget'],
	context: StandardMethodDecoratorArgs['nameOrContext'],
) => any;

type LegacyMethodFn = (
	proto: LegacyMethodDecoratorArgs['protoOrTarget'],
	name: LegacyMethodDecoratorArgs['nameOrContext'],
	descriptor: LegacyMethodDecoratorArgs['descriptor'],
) => any;

export function fieldDecoratorBridge(
	standard: StandardFieldFn,
	legacy: LegacyFieldFn,
	protoOrTarget: StandardOrLegacyFieldDecoratorArgs['protoOrTarget'],
	nameOrContext: StandardOrLegacyFieldDecoratorArgs['nameOrContext'],
): any {
	if (typeof nameOrContext === 'object') {
		return standard(protoOrTarget as undefined, nameOrContext as ClassFieldDecoratorContext<any, any>);
	}
	return legacy(
		protoOrTarget as LegacyFieldDecoratorArgs['protoOrTarget'],
		nameOrContext as LegacyFieldDecoratorArgs['nameOrContext'],
	);
}

export function methodDecoratorBridge(
	standard: StandardMethodFn,
	legacy: LegacyMethodFn,
	protoOrTarget: StandardOrLegacyMethodDecoratorArgs['protoOrTarget'],
	nameOrContext: StandardOrLegacyMethodDecoratorArgs['nameOrContext'],
	descriptor?: StandardOrLegacyMethodDecoratorArgs['descriptor'],
): any {
	if (typeof nameOrContext === 'object') {
		return standard(
			protoOrTarget as StandardMethodDecoratorArgs['protoOrTarget'],
			nameOrContext as StandardMethodDecoratorArgs['nameOrContext'],
		);
	}
	return legacy(
		protoOrTarget as LegacyMethodDecoratorArgs['protoOrTarget'],
		nameOrContext as LegacyMethodDecoratorArgs['nameOrContext'],
		descriptor as LegacyMethodDecoratorArgs['descriptor'],
	);
}
