import { renderComponent } from '@ecopages/radiant';
import type { TodoContext } from './radiant-todo-app.script';
import { RadiantTodoAppElement } from './radiant-todo-app.script';

type RadiantTodoAppTemplateProps = {
	todos: TodoContext['todos'];
};

const getData = (): RadiantTodoAppTemplateProps => {
	const now = Date.now();
	return {
		todos: [
			{ id: now.toString(), text: 'Create a todo app', complete: true },
			{ id: (now + 1).toString(), text: 'Add a todo item', complete: false },
			{ id: (now + 2).toString(), text: 'Complete a todo item', complete: false },
		],
	};
};
export const RadiantTodoApp = async () => {
	const data = getData();
	const { preview } = await renderComponent(RadiantTodoAppElement, {
		configure: (component) => {
			component.setAttribute('class', 'todo');
			component.provider.setContext({ todos: data.todos });
		},
	});

	return preview;
};

RadiantTodoApp.config = {
	dependencies: {
		scripts: ['./radiant-todo-app.script.tsx'],
		stylesheets: ['./radiant-todo-app.css'],
	},
};
