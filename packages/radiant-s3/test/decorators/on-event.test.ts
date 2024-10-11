import { describe, expect, it, vi } from 'vitest';
import type { RadiantElement } from '../../src/core/radiant-element';
import { onEvent } from '../../src/decorators/on-event';

describe('onEvent', () => {
  it('should add event listener to window when window is true in eventConfig', () => {
    const mockMethod = vi.fn();
    const mockContext = {
      addInitializer: vi.fn(),
    };

    const eventConfig = {
      type: 'click',
      window: true,
    };

    const decorator = onEvent(eventConfig);
    decorator(mockMethod, mockContext as any);

    const initializer = mockContext.addInitializer.mock.calls[0][0];
    const mockElement = {
      registerCleanupCallback: vi.fn(),
    } as unknown as RadiantElement;

    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    initializer.call(mockElement);

    expect(addEventListenerSpy).toHaveBeenCalledWith(eventConfig.type, expect.any(Function), undefined);
    expect(mockElement.registerCleanupCallback).toHaveBeenCalledWith(expect.any(Function));

    addEventListenerSpy.mockRestore();
  });

  it('should add event listener to document when document is true in eventConfig', () => {
    const mockMethod = vi.fn();
    const mockContext = {
      addInitializer: vi.fn(),
    };

    const eventConfig = {
      type: 'click',
      document: true,
    };

    const decorator = onEvent(eventConfig);
    decorator(mockMethod, mockContext as any);

    const initializer = mockContext.addInitializer.mock.calls[0][0];
    const mockElement = {
      registerCleanupCallback: vi.fn(),
    } as unknown as RadiantElement;

    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

    initializer.call(mockElement);

    expect(addEventListenerSpy).toHaveBeenCalledWith(eventConfig.type, expect.any(Function), undefined);
    expect(mockElement.registerCleanupCallback).toHaveBeenCalledWith(expect.any(Function));

    addEventListenerSpy.mockRestore();
  });
});
