import { buildPlaygroundExampleCode } from './example-code';
import type { PlaygroundControl } from './types';

const SCENARIO_ONLY_PROPS = new Set(['message', 'title', 'description']);

export function buildExampleCode(
	exportName: string,
	slug: string,
	props: Record<string, unknown>,
	children?: string,
): string {
	const tailored = buildPlaygroundExampleCode(slug, props, children);
	if (tailored) return tailored;

	const propParts = Object.entries(props)
		.filter(([key]) => !SCENARIO_ONLY_PROPS.has(key))
		.filter(([, value]) => value !== false && value !== undefined && value !== '')
		.map(([key, value]) => {
			if (typeof value === 'boolean') return key;
			return `${key}={${typeof value === 'number' ? value : `"${value}"`}}`;
		});
	const tag = exportName.split(' ')[0];
	const open = propParts.length > 0 ? `<${exportName} ${propParts.join(' ')}>` : `<${exportName}>`;
	return [`import { ${exportName} } from '@ecopages/radiant-ui/${slug}';`, '', `${open}${children ?? ''}</${tag}>`].join(
		'\n',
	);
}

export function playgroundControlCount(scenarios: { controls?: PlaygroundControl[] }[]): number {
	const activeControls = scenarios[0]?.controls?.length ?? 0;
	const scenarioPicker = scenarios.length > 1 ? 1 : 0;
	return activeControls + scenarioPicker;
}
