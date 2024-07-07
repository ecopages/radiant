import type { LiteCounterProps } from './lite-counter.script';
import './lite-counter.script';
import './lite-counter.css';

export const LiteCounter = ({ value }: LiteCounterProps) => {
  return (
    <lite-counter value={value}>
      <button type="button" data-ref="decrement" aria-label="Decrement">
        -
      </button>
      <span data-ref="count">{value}</span>
      <button type="button" data-ref="increment" aria-label="Increment">
        +
      </button>
    </lite-counter>
  );
};
