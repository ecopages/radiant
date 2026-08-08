import type { PlaygroundControl } from './types';

export function selectControl(config: {
	prop: string;
	label: string;
	description?: string;
	options: { value: string; label: string }[];
	defaultValue: string;
}): PlaygroundControl {
	return { kind: 'select', ...config };
}

export function booleanControl(config: {
	prop: string;
	label: string;
	description?: string;
	defaultValue: boolean;
}): PlaygroundControl {
	return { kind: 'boolean', ...config };
}

export function textControl(config: {
	prop: string;
	label: string;
	description?: string;
	defaultValue: string;
}): PlaygroundControl {
	return { kind: 'text', ...config };
}

export function numberControl(config: {
	prop: string;
	label: string;
	description?: string;
	defaultValue: number;
	min?: number;
	max?: number;
	step?: number;
}): PlaygroundControl {
	return { kind: 'number', ...config };
}
