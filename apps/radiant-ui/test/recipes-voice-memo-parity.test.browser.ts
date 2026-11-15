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
	test('the four forms pass through the same states with the same buttons and the same text', async () => {
		const plain = await flowOf({ mount: () => mountRecipe('voice-memo'), remove });
		const element = await flowOf({ mount: () => mountForm('voice-memo', 'radiant'), remove });
		const component = await flowOf({ mount: () => mountComponent('voice-memo'), remove });
		const controller = await flowOf({ mount: () => mountController('voice-memo'), remove });

		expect(plain).toHaveLength(5);
		expect(element).toEqual(plain);
		expect(component).toEqual(plain);
		expect(controller).toEqual(plain);
	});
});
