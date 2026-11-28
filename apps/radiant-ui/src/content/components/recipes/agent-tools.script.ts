import { registerAgentTool } from '@ecopages/radiant/helpers/register-agent-tool';
import { mountExample } from '../../../components/primitive-example/mount-example';
import { addItemSchema, parseAddItem, type AddItem } from './agent-tools.data';

export function mount(root: HTMLElement): () => void {
	const form = root.querySelector('form')!;
	const input = root.querySelector('input')!;
	const list = root.querySelector('ul')!;
	const status = root.querySelector('[data-status]')!;

	const addItem = ({ sku }: AddItem) => {
		const item = document.createElement('li');
		item.textContent = sku;
		list.append(item);
		const count = list.children.length;
		status.textContent = `${count} in cart`;
		return { count };
	};

	const unregister = registerAgentTool({
		name: 'add_to_cart',
		description: 'Adds a product to the cart by its SKU.',
		annotations: { consequentialHint: false },
		inputSchema: addItemSchema,
		parse: parseAddItem,
		execute: addItem,
	});

	const submit = (event: SubmitEvent) => {
		event.preventDefault();
		addItem({ sku: input.value });
	};
	form.addEventListener('submit', submit);

	return () => {
		form.removeEventListener('submit', submit);
		unregister();
	};
}

mountExample('agent-tools', mount);
