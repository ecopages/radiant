import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { onEvent } from '../../src/decorators/on-event';

describe('onEvent', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should add event listener to window when window is true in eventConfig', () => {
    @customElement('window-event-emitter')
    class WindowEventLister extends RadiantElement {
      received = false;
      @onEvent({ window: true, type: 'click' })
      emitEvent() {
        this.received = true;
      }
    }

    const element = document.createElement('window-event-emitter') as WindowEventLister;
    document.appendChild(element);
    window.dispatchEvent(new Event('click'));
    window.addEventListener('click', () => {
      expect(element.received).toBeTruthy();
    });
  });

  it('should add event listener to document when document is true in eventConfig', () => {
    @customElement('window-event-emitter')
    class DocumentEventLister extends RadiantElement {
      received = false;
      @onEvent({ document: true, type: 'click' })
      emitEvent() {
        this.received = true;
      }
    }

    const element = document.createElement('window-event-emitter') as DocumentEventLister;
    document.appendChild(element);
    document.dispatchEvent(new Event('click'));
    document.addEventListener('click', () => {
      expect(element.received).toBeTruthy();
    });
  });
});
