import { RadiantElement } from './radiant-element';
import { WithJsx } from '../mixins/with-jsx';

/**
 * A Radiant base class with `@ecopages/jsx` rendering built in.
 */
export class RadiantElementJsx extends WithJsx(RadiantElement) {}
