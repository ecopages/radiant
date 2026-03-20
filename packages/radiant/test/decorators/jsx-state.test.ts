import { describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { jsxState } from '../../src/decorators/jsx-state';

class MyJsxStateElement extends RadiantElement {
	@jsxState numberOfClicks = 1;

	override connectedCallback() {
		super.connectedCallback();
		this.updateClicks = this.updateClicks.bind(this);
		this.registerUpdateCallback('numberOfClicks', this.updateClicks);
	}

	addClick() {
		this.numberOfClicks++;
	}

	updateClicks() {
		this.innerHTML = this.numberOfClicks.toString();
	}
}

customElements.define('my-jsx-state-field', MyJsxStateElement);

describe('@jsxState', () => {
	test('decorator updates the element correctly and exposes a bound companion accessor', () => {
		const customElement = document.createElement('my-jsx-state-field') as MyJsxStateElement;
		customElement.innerHTML = '1';
		document.body.appendChild(customElement);

		expect(customElement.innerHTML).toEqual('1');
		expect(customElement.bind('numberOfClicks').getValue()).toEqual(1);

		customElement.addClick();

		expect(customElement.innerHTML).toEqual('2');
		expect(customElement.bind('numberOfClicks').getValue()).toEqual(2);
	});
});
