import type { RadiantElement } from './core/radiant-element';

export type Constructor<T = unknown> = { new (...args: any[]): NonNullable<T> };

export type ConstructorParams<T extends Constructor> = ConstructorParameters<T>;

export type Context = {
	kind: string;
	name: string | symbol;
	access: {
		get?(): unknown;
		set?(value: unknown): void;
		has?(value: unknown): boolean;
	};
	private?: boolean;
	static?: boolean;
	addInitializer?(initializer: () => void): void;
};

export type ClassDecorator = <T extends Constructor>(target: T, context: Context) => T | void;

export type Method = (...args: any[]) => any;

/**
 * @deprecated
 */
export type StanderOrLegacyClassDecorator = {
	(target: Constructor): typeof target | void;
	(target: CustomElementConstructor, context: ClassDecoratorContext): void;
};

export type LegacyClassDecoratorArgs = {
	protoOrTarget: CustomElementConstructor;
	nameOrContext: string;
	descriptor: PropertyDescriptor;
};

export type StandardClassDecoratorArgs = {
	protoOrTarget: CustomElementConstructor;
	nameOrContext: ClassDecoratorContext;
};

export type StandardOrLegacyClassDecoratorArgs = LegacyClassDecoratorArgs | StandardClassDecoratorArgs;

/**
 * @deprecated
 */
export type StandardOrLegacMethodDecorator = {
	(proto: Constructor<HTMLElement>): PropertyDescriptor;
	(target: Method, context: ClassMethodDecoratorContext): void;
};

export type LegacyMethodDecoratorArgs = {
	protoOrTarget: RadiantElement;
	nameOrContext: string;
	descriptor: PropertyDescriptor;
};

export type StandardMethodDecoratorArgs = {
	protoOrTarget: Method;
	nameOrContext: ClassMethodDecoratorContext;
	descriptor: undefined;
};

export type StandardOrLegacyMethodDecoratorArgs = LegacyMethodDecoratorArgs | StandardMethodDecoratorArgs;

/**
 * @deprecated
 */
export type StandardOrLegacyClassFieldDecorator = {
	(proto: RadiantElement, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor;
	(target: undefined, context: ClassFieldDecoratorContext): void;
};

export type LegacyFieldDecoratorArgs = {
	protoOrTarget: RadiantElement;
	nameOrContext: string;
	descriptor: PropertyDescriptor;
};

export type StandardFieldDecoratorArgs<T = unknown, V = unknown> = {
	protoOrTarget: undefined;
	nameOrContext: ClassFieldDecoratorContext<T, V>;
};

export type StandardOrLegacyFieldDecoratorArgs = LegacyFieldDecoratorArgs | StandardFieldDecoratorArgs;

export type CustomElementClass = Omit<typeof HTMLElement, 'new'>;

export const guards = {
	isStandard: {
		ClassDecorator: function (
			args: any,
		): args is [CustomElementConstructor, ClassDecoratorContext<CustomElementConstructor>] {
			return typeof args[1] !== 'undefined';
		},
		MethodDecorator: function (args: any): args is [Method, ClassMethodDecoratorContext] {
			return typeof args[1] === 'object';
		},
		FieldDecorator: function (args: any): args is [undefined, ClassFieldDecoratorContext] {
			return typeof args[1] === 'object';
		},
	},
};
