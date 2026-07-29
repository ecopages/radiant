import { parse } from '@babel/parser';
import babelTraverse from '@babel/traverse';

/**
 * `@babel/traverse` is CJS; under Node ESM the default import is the module namespace
 * and the callable lives on `.default`.
 */
const traverse =
	typeof babelTraverse === 'function'
		? babelTraverse
		: (babelTraverse as unknown as { default: typeof babelTraverse }).default;

export type RadiantDomModuleMetadata = {
	customElementTagNames: readonly string[];
	controllerIdentifiers: readonly string[];
};

type DecoratorNode = {
	expression: {
		type: string;
		callee?: { type: string; name?: string; property?: { type: string; name?: string } };
		arguments?: Array<{ type: string; value?: string }>;
		name?: string;
		property?: { type: string; name?: string };
	};
};

type ClassLikeNode = {
	decorators?: DecoratorNode[];
};

const decoratorParserPlugins = ['typescript', 'jsx', 'decorators'] as const;

/**
 * Extract `@customElement` and `@controller` string literals from a component script module.
 */
export function extractRadiantDomModuleMetadata(source: string): RadiantDomModuleMetadata {
	const customElementTagNames: string[] = [];
	const controllerIdentifiers: string[] = [];

	let program;

	try {
		program = parse(source, {
			sourceType: 'module',
			plugins: [...decoratorParserPlugins],
		});
	} catch {
		return { customElementTagNames, controllerIdentifiers };
	}

	traverse(program, {
		ClassDeclaration(classPath) {
			collectClassDecorators(classPath.node as ClassLikeNode, customElementTagNames, controllerIdentifiers);
		},
		ClassExpression(classPath) {
			collectClassDecorators(classPath.node as ClassLikeNode, customElementTagNames, controllerIdentifiers);
		},
	});

	return { customElementTagNames, controllerIdentifiers };
}

function collectClassDecorators(
	node: ClassLikeNode,
	customElementTagNames: string[],
	controllerIdentifiers: string[],
): void {
	for (const decorator of node.decorators ?? []) {
		const literal = readDecoratorStringLiteral(decorator);

		if (!literal) {
			continue;
		}

		const decoratorName = readDecoratorName(decorator);

		if (decoratorName === 'customElement') {
			customElementTagNames.push(literal);
		}

		if (decoratorName === 'controller') {
			controllerIdentifiers.push(literal);
		}
	}
}

function readDecoratorName(decorator: DecoratorNode): string | undefined {
	const expression = decorator.expression;

	if (expression.type === 'CallExpression' && expression.callee) {
		return readCalleeIdentifier(expression.callee);
	}

	return readCalleeIdentifier(expression);
}

function readCalleeIdentifier(
	expression: NonNullable<DecoratorNode['expression']['callee']> | DecoratorNode['expression'],
): string | undefined {
	if (expression.type === 'Identifier' && expression.name) {
		return expression.name;
	}

	if (
		expression.type === 'MemberExpression' &&
		expression.property?.type === 'Identifier' &&
		expression.property.name
	) {
		return expression.property.name;
	}

	return undefined;
}

function readDecoratorStringLiteral(decorator: DecoratorNode): string | undefined {
	const expression = decorator.expression;
	const call = expression.type === 'CallExpression' ? expression : undefined;
	const firstArgument = call?.arguments?.[0];

	if (!firstArgument || firstArgument.type !== 'StringLiteral' || typeof firstArgument.value !== 'string') {
		return undefined;
	}

	return firstArgument.value;
}

export function serializeRadiantDomModuleMetadata(metadata: RadiantDomModuleMetadata): string {
	return JSON.stringify({
		customElementTagNames: [...metadata.customElementTagNames],
		controllerIdentifiers: [...metadata.controllerIdentifiers],
	});
}
