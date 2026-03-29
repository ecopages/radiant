import { beforeEach, describe, expect, test } from 'vitest';
import { RadiantComponent } from '../../src/core/radiant-component';
import { customElement } from '../../src/decorators/custom-element';
import { querySlot } from '../../src/decorators/query-slot';

declare const __LEGACY_ENVIRONMENT__: boolean;

const LEGACY_ENVIRONMENT = __LEGACY_ENVIRONMENT__;
const describeWhenStandard = LEGACY_ENVIRONMENT ? describe.skip : describe;

@customElement('query-slot-card-test')
class QuerySlotCard extends RadiantComponent {
	@querySlot() defaultSlot!: HTMLParagraphElement | null;
	@querySlot({ name: 'header' }) headerSlot!: HTMLHeadingElement | null;
	@querySlot({ name: 'header', all: true }) allHeaderSlots!: HTMLHeadingElement[];

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

describe('@querySlot', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	describeWhenStandard('standard decorators only', () => {
		test('returns stable defaults before connect', () => {
			const element = document.createElement('query-slot-card-test') as QuerySlotCard;

			expect(element.defaultSlot).toBeNull();
			expect(element.headerSlot).toBeNull();
			expect(element.allHeaderSlots).toEqual([]);
		});
	});

	test('queries projected elements from default and named slots', async () => {
		const element = document.createElement('query-slot-card-test') as QuerySlotCard;
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
		const element = document.createElement('query-slot-card-test') as QuerySlotCard;
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
});
