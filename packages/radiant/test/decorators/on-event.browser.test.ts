import { beforeEach, describe, expect, it, vi } from 'vitest';
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

	it('should add event listener to a media query list when mediaQuery is set', () => {
		const matchMedia = vi.fn((query: string) => {
			const listeners = new Set<(event: MediaQueryListEvent) => void>();
			return {
				matches: false,
				media: query,
				addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
					listeners.add(listener);
				},
				removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
					listeners.delete(listener);
				},
				dispatchChange(matches: boolean) {
					for (const listener of listeners) {
						listener({ matches } as MediaQueryListEvent);
					}
				},
			} as MediaQueryList & { dispatchChange: (matches: boolean) => void };
		});
		vi.stubGlobal('matchMedia', matchMedia);

		@customElement('media-query-on-event-listener')
		class MediaQueryEventListener extends RadiantElement {
			/** Named to avoid shadowing `Element.prototype.matches`. */
			matchedDark: boolean | null = null;

			@onEvent({ mediaQuery: '(prefers-color-scheme: dark)', type: 'change' })
			onMediaQueryChange(event: MediaQueryListEvent) {
				this.matchedDark = event.matches;
			}
		}

		const element = document.createElement('media-query-on-event-listener') as MediaQueryEventListener;
		document.body.appendChild(element);

		const mediaQueryList = matchMedia.mock.results[0]?.value as MediaQueryList & {
			dispatchChange: (matches: boolean) => void;
		};
		mediaQueryList.dispatchChange(true);
		expect(element.matchedDark).toBe(true);

		element.remove();
		element.matchedDark = null;
		mediaQueryList.dispatchChange(false);
		expect(element.matchedDark).toBeNull();

		vi.unstubAllGlobals();
	});

	it('should fire delegated listeners when the click target is nested inside the match', () => {
		@customElement('nested-on-event-listener')
		class NestedOnEventListener extends RadiantElement {
			received = false;

			@onEvent({ ref: 'nested-btn', type: 'click' })
			onNestedClick() {
				this.received = true;
			}
		}

		const element = document.createElement('nested-on-event-listener') as NestedOnEventListener;
		const button = document.createElement('button');
		button.setAttribute('data-ref', 'nested-btn');
		const icon = document.createElement('span');
		button.appendChild(icon);
		element.appendChild(button);
		document.body.appendChild(element);

		icon.dispatchEvent(new MouseEvent('click', { bubbles: true }));
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

	it('fires an inherited event handler once, including after reconnect', () => {
		@customElement('inherited-on-event-base')
		class InheritedOnEventBase extends RadiantElement {
			clickCount = 0;

			@onEvent({ ref: 'inherited-btn', type: 'click' })
			onInheritedClick() {
				this.clickCount += 1;
			}
		}

		@customElement('inherited-on-event-child')
		class InheritedOnEventChild extends InheritedOnEventBase {}

		@customElement('inherited-on-event-grandchild')
		class InheritedOnEventGrandchild extends InheritedOnEventChild {}

		const element = document.createElement('inherited-on-event-grandchild') as InheritedOnEventGrandchild;
		const button = document.createElement('button');
		button.setAttribute('data-ref', 'inherited-btn');
		element.appendChild(button);
		document.body.appendChild(element);

		button.click();
		expect(element.clickCount).toBe(1);

		element.remove();
		document.body.appendChild(element);
		button.click();

		expect(element.clickCount).toBe(2);
	});
});
