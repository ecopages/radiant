import type { DocsArgs, DocsMetaAny } from './types';

function formatPropValue(value: unknown): string | null {
	if (value === false || value === undefined || value === null || value === '') return null;
	if (value === true) return null; // boolean shorthand handled by caller
	if (typeof value === 'number') return `{${value}}`;
	return `="${String(value)}"`;
}

/**
 * Generic live-example source from args.
 *
 * @remarks
 * Prefer `meta.exampleCode` for composable components whose markup cannot be
 * inferred from props alone (Alert, Dialog, …).
 */
export function buildGenericExampleCode(
	exportName: string,
	component: string,
	args: DocsArgs,
	children = 'Label',
): string {
	const propParts = Object.entries(args)
		.filter(([key]) => key !== 'children')
		.flatMap(([key, value]) => {
			if (value === false || value === undefined || value === null || value === '') return [];
			if (value === true) return [key];
			const formatted = formatPropValue(value);
			if (formatted == null) return [];
			if (formatted.startsWith('{')) return [`${key}=${formatted}`];
			return [`${key}${formatted}`];
		});

	const tag = exportName.split(' ')[0] ?? exportName;
	const child = typeof args.children === 'string' ? args.children : children;
	const open = propParts.length > 0 ? `<${exportName} ${propParts.join(' ')}>` : `<${exportName}>`;

	return [`import { ${exportName} } from '@ecopages/radiant-ui/${component}';`, '', `${open}${child}</${tag}>`].join(
		'\n',
	);
}

export function resolveExampleCode(meta: DocsMetaAny, args: DocsArgs): string {
	if (meta.exampleCode) return meta.exampleCode(args);
	if (!meta.component || !meta.exportName) return '';
	return buildGenericExampleCode(meta.exportName, meta.component, args);
}
