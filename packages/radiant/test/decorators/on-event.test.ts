import { beforeEach, describe, expect, it } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { onEvent } from '../../src/decorators/on-event';

describe('onEvent', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('should add event listener to window when window is true in eventConfig', () => {
		@customElement('window-on-event-listener')
		class WindowEventLister extends RadiantElement {
			received = false;
			@onEvent({ window: true, type: 'click' })
			emitEvent() {
				this.received = true;
			}
		}

		const element = document.createElement('window-on-event-listener') as WindowEventLister;
		document.body.appendChild(element);
		window.dispatchEvent(new Event('click'));
		expect(element.received).toBeTruthy();
	});

	it('should add event listener to document when document is true in eventConfig', () => {
		@customElement('document-on-event-listener')
		class DocumentEventLister extends RadiantElement {
			received = false;
			@onEvent({ document: true, type: 'click' })
			emitEvent() {
				this.received = true;
			}
		}

		const element = document.createElement('document-on-event-listener') as DocumentEventLister;
		document.body.appendChild(element);
		document.dispatchEvent(new Event('click'));
		expect(element.received).toBeTruthy();
	});

	it('should listen to delegated events in shadow DOM when scope is shadow', () => {
		@customElement('shadow-on-event-listener')
		class ShadowOnEventListener extends RadiantElement {
			received = false;

			constructor() {
				super();
				const shadowRoot = this.attachShadow({ mode: 'open' });
				const button = document.createElement('button');
				button.setAttribute('data-ref', 'shadow-btn');
				button.textContent = 'Shadow';
				shadowRoot.appendChild(button);
			}

			@onEvent({ ref: 'shadow-btn', type: 'click', scope: 'shadow' })
			onShadowClick() {
				this.received = true;
			}
		}

		const element = document.createElement('shadow-on-event-listener') as ShadowOnEventListener;
		document.body.appendChild(element);
		element.shadowRoot
			?.querySelector('[data-ref="shadow-btn"]')
			?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
		expect(element.received).toBeTruthy();
	});

	it('should not duplicate delegated listeners across reconnects', () => {
		@customElement('reconnect-on-event-listener')
		class ReconnectOnEventListener extends RadiantElement {
			clickCount = 0;

			@onEvent({ ref: 'reconnect-btn', type: 'click' })
			onReconnectClick() {
				this.clickCount += 1;
			}
		}

		const element = document.createElement('reconnect-on-event-listener') as ReconnectOnEventListener;
		const button = document.createElement('button');
		button.setAttribute('data-ref', 'reconnect-btn');
		element.appendChild(button);
		document.body.appendChild(element);

		button.click();
		element.remove();
		document.body.appendChild(element);
		button.click();

		expect(element.clickCount).toBe(2);
	});
});
