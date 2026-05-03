import type { JsxRenderable } from '@ecopages/jsx';
import { stringifyTyped } from '@ecopages/radiant/tools/stringify-typed';
import type { TodoContext } from './radiant-todo-app.script';
import { NoCompletedTodosMessage, NoTodosMessage, TodoList } from './radiant-todo.templates';
import './radiant-todo-app.script';
import './radiant-todo-app.css';

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

const TodoPanel = ({
	title,
	count,
	children,
	ref,
}: {
	title: string;
	count: number;
	children: JsxRenderable;
	ref: string;
}) => {
	return (
		<article class="todo__panel">
			<h2>{title}</h2>
			<p class="todo__count">
				{title}: <span data-ref={`count-${ref}`}>{count}</span>
			</p>
			<div class="todo__list" data-ref={`list-${ref}`}>
				{children}
			</div>
		</article>
	);
};

const TodoForm = () => {
	return (
		<form>
			<div class="form-group">
				<label for="new-todo">Add Todo</label>
				<input id="new-todo" name="todo" />
			</div>
			<button type="submit">Add</button>
		</form>
	);
};

export const RadiantTodoApp = () => {
	const data = getData();
	const incompleteTodos = data.todos.filter((todo) => !todo.complete);
	const completedTodos = data.todos.filter((todo) => todo.complete);
	return (
		<>
			<radiant-todo-app class="todo" initialTodos={stringifyTyped<TodoContext['todos'], string>(data.todos)}>
				<section class="todo__board">
					<TodoPanel title="Incomplete Todos" count={incompleteTodos.length} ref="incomplete">
						{incompleteTodos.length > 0 ? <TodoList todos={incompleteTodos} /> : <NoTodosMessage />}
					</TodoPanel>
					<TodoPanel title="Completed Todos" count={completedTodos.length} ref="complete">
						{completedTodos.length > 0 ? <TodoList todos={completedTodos} /> : <NoCompletedTodosMessage />}
					</TodoPanel>
				</section>
				<TodoForm />
			</radiant-todo-app>
		</>
	);
};
