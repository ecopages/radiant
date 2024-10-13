import type { Method } from '../../types';

export function debounce(timeout: number): Method {
  let timeoutRef: ReturnType<typeof setTimeout> | null = null;

  return <T extends Method>(originalMethod: T): Method => {
    return function (this: any, ...args: any[]): T {
      if (timeoutRef !== null) {
        clearTimeout(timeoutRef);
      }

      timeoutRef = setTimeout(() => {
        originalMethod.apply(this, args);
      }, timeout);

      return originalMethod;
    };
  };
}
