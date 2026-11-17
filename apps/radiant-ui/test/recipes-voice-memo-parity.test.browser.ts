import { afterEach, describe, expect, test } from 'vitest';
import { syncExamples } from '../src/components/primitive-example/mount-example';
import { flowOf, type VoiceMemoForm } from './voice-memo-shared';
import { mountComponent, mountController, mountForm, mountRecipe } from './mount-recipe';

afterEach(() => {
	document.body.innerHTML = '';
	syncExamples();
});

const remove: VoiceMemoForm['remove'] = async (root) => {
	root.remove();
	syncExamples();
	await new Promise((resolve) => setTimeout(resolve, 50));
};

describe('voice memo forms', () => {
	let recorded: Promise<string[]> | undefined;
	const plain = () => (recorded ??= flowOf({ mount: () => mountRecipe('voice-memo'), remove }));

	test('the plain form passes through five states', async () => {
		expect(await plain()).toHaveLength(5);
	});

	test.each([
		['element', () => mountForm('voice-memo', 'radiant')],
		['component', () => mountComponent('voice-memo')],
		['controller', () => mountController('voice-memo')],
	])('the %s form passes through the same states with the same buttons and the same text', async (_, mount) => {
		expect(await flowOf({ mount, remove })).toEqual(await plain());
	});
});
