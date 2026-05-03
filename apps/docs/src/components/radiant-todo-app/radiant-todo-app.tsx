import { stringifyTyped } from '@ecopages/radiant/tools/stringify-typed';
import { createTodoSamples, type Todo } from './todo-context';
import './radiant-todo-app.script';

export const RadiantTodoApp = () => {
	const initialContext = stringifyTyped<{ todos: Todo[] }, string>({ todos: createTodoSamples() });

	return (
		<radiant-todo-app class="todo">
			<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="provider">
				{initialContext}
			</script>
		</radiant-todo-app>
	);
};

RadiantTodoApp.config = {
	dependencies: {
		scripts: ['./radiant-todo-app.script.tsx'],
		stylesheets: ['./radiant-todo-app.css'],
	},
};
