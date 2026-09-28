import { describe, expect, test } from 'vitest';
import { extractRadiantDomModuleMetadata } from '../src/elements/extract-dom-metadata';

describe('extractRadiantDomModuleMetadata', () => {
	test('reads custom element and controller decorators on exported classes', () => {
		const source = `
			import { customElement, controller } from '@ecopages/radiant';

			@customElement('radiant-demo-card')
			@controller('demo-card')
			export class RadiantDemoCard {}
		`;

		expect(extractRadiantDomModuleMetadata(source)).toEqual({
			customElementTagNames: ['radiant-demo-card'],
			controllerIdentifiers: ['demo-card'],
		});
	});

	test('collects decorators on non-exported classes', () => {
		const source = `
			@customElement('radiant-hidden')
			class HiddenElement {}
		`;

		expect(extractRadiantDomModuleMetadata(source)).toEqual({
			customElementTagNames: ['radiant-hidden'],
			controllerIdentifiers: [],
		});
	});

	test('returns empty metadata for invalid source', () => {
		expect(extractRadiantDomModuleMetadata('not valid ts {')).toEqual({
			customElementTagNames: [],
			controllerIdentifiers: [],
		});
	});
});
