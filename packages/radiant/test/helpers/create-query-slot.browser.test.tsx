import { beforeEach, describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { createQuerySlot } from '../../src/helpers/create-query-slot';

@customElement('query-slot-helper-test')
class QuerySlotHelperCard extends RadiantElement {
	#defaultSlot = createQuerySlot<HTMLParagraphElement>(this, {});
	#headerSlot = createQuerySlot<HTMLHeadingElement>(this, { name: 'header' });
	#allHeaderSlots = createQuerySlot<HTMLHeadingElement[]>(this, { name: 'header', all: true });

	get defaultSlot() {
		return this.#defaultSlot.value;
	}

	get headerSlot() {
		return this.#headerSlot.value;
	}

	get allHeaderSlots() {
		return this.#allHeaderSlots.value;
	}

	override render() {
		return (
			<section>
				<header>
					<slot name="header" />
				</header>
				<div>
					<slot />
				</div>
			</section>
		);
	}
}

describe('createQuerySlot', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('queries projected elements from default and named slots', async () => {
		const element = document.createElement('query-slot-helper-test') as QuerySlotHelperCard;
		const heading = document.createElement('h2');
		heading.setAttribute('slot', 'header');
		heading.textContent = 'Heading';
		const body = document.createElement('p');
		body.textContent = 'Body';
		element.append(heading, body);
		document.body.appendChild(element);

		await Promise.resolve();

		expect(element.headerSlot?.textContent).toBe('Heading');
		expect(element.defaultSlot?.textContent).toBe('Body');
		expect(element.allHeaderSlots).toHaveLength(1);
	});

	test('invalidates cached slot queries after reprojection', async () => {
		const element = document.createElement('query-slot-helper-test') as QuerySlotHelperCard;
		document.body.appendChild(element);

		await Promise.resolve();

		expect(element.allHeaderSlots).toHaveLength(0);

		const heading = document.createElement('h2');
		heading.setAttribute('slot', 'header');
		heading.textContent = 'Late heading';
		element.appendChild(heading);

		await Promise.resolve();
		await Promise.resolve();

		expect(element.allHeaderSlots).toHaveLength(1);
		expect(element.headerSlot?.textContent).toBe('Late heading');
	});

	test('returns null for missing named slot content', async () => {
		const element = document.createElement('query-slot-helper-test') as QuerySlotHelperCard;
		document.body.appendChild(element);

		await Promise.resolve();

		expect(element.headerSlot).toBeNull();
	});
});
