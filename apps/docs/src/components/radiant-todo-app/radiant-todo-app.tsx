import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { escapeScriptJson } from '@ecopages/radiant/tools/escape-script-json';
import { createTodoSamples, type Todo } from './todo-context';
import './radiant-todo-app.script';

export const RadiantTodoApp = eco.component<{}, JsxRenderable>({
	dependencies: {
		scripts: ['./radiant-todo-app.script.tsx'],
		stylesheets: ['./radiant-todo-app.css'],
	},
	render: () => {
		const initialContext = escapeScriptJson(
			JSON.stringify({ todos: createTodoSamples() } satisfies { todos: Todo[] }),
		);

		return (
			<radiant-todo-app class="todo">
				<script
					type="application/json"
					data-hydration
					data-hydration-type="context"
					data-hydration-key="provider"
				>
					{initialContext}
				</script>
			</radiant-todo-app>
		);
	},
});
