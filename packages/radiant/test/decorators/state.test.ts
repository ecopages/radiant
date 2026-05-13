import { describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { state } from '../../src/decorators/state';

class MyStateElement extends RadiantElement {
	@state numberOfClicks = 1;

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

class MyComponentStateElement extends RadiantElement {
	@state numberOfClicks = 1;

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

customElements.define('my-state-field', MyStateElement);

customElements.define('my-component-state-field', MyComponentStateElement);

describe('@state', () => {
	test('updates a plain RadiantElement without implicit binding', () => {
		const customElement = document.createElement('my-state-field') as MyStateElement;
		customElement.innerHTML = '1';
		document.body.appendChild(customElement);

		expect(customElement.innerHTML).toEqual('1');
		expect(Object.prototype.hasOwnProperty.call(customElement, '$numberOfClicks')).toBe(false);

		customElement.addClick();

		expect(customElement.innerHTML).toEqual('2');
	});

	test('enables a bound companion accessor by default on RadiantElement', () => {
		const customElement = document.createElement('my-component-state-field') as MyComponentStateElement & {
			$numberOfClicks: ReturnType<MyComponentStateElement['bind']>;
		};
		customElement.innerHTML = '1';
		document.body.appendChild(customElement);

		expect(customElement.innerHTML).toEqual('1');
		expect(customElement.$numberOfClicks.getValue()).toEqual(1);

		customElement.addClick();

		expect(customElement.innerHTML).toEqual('2');
		expect(customElement.$numberOfClicks.getValue()).toEqual(2);
	});
});
