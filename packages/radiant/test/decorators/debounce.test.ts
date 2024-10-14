import { describe, expect, test } from 'vitest';
import { debounce } from '../../src/decorators/debounce';

describe('@debounce', () => {
  test('decorator debounces a method correctly', async () => {
    class Test {
      callCount = 0;
      @debounce(5)
      method(): void {
        this.callCount++;
      }
    }

    const test = new Test();
    Array.from({ length: 3 }, () => test.method());
    await new Promise((resolve) => setTimeout(resolve, 10));
    Array.from({ length: 3 }, () => test.method());
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(test.callCount).toBe(2);
  });
});
