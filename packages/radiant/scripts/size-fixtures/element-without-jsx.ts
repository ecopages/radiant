/**
 * Size fixture: an Element Host with events and a ref but no JSX view, bundled with `@ecopages/jsx` included.
 *
 * @remarks Guards the JSX opt-in: if Radiant imports the DOM renderer again, this bundle grows by about 40 kB.
 */
import { RadiantElement, customElement, onEvent, ref } from '../../src/index';

@customElement('size-element-without-jsx')
export class SizeElementWithoutJsx extends RadiantElement {
	@ref('list') list!: HTMLUListElement | null;

	@onEvent({ ref: 'add', type: 'click' })
	add() {
		this.list?.append(document.createElement('li'));
	}
}
