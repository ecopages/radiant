import { createContext } from '@ecopages/radiant';

export type Todo = {
	id: string;
	text: string;
	complete: boolean;
};

export class TodoLogger {
	public log(message: string): void {
		console.log('%cTODO', 'background: #222; color: #bada55', message);
	}
}

export type TodoContext = {
	todos: Todo[];
	logger: TodoLogger;
};

export const todoContext = createContext<TodoContext>(Symbol('todo-context'));

export const createTodoSamples = (): Todo[] => {
	const now = Date.now();

	return [
		{ id: now.toString(), text: 'Create a todo app', complete: true },
		{ id: (now + 1).toString(), text: 'Add a todo item', complete: false },
		{ id: (now + 2).toString(), text: 'Complete a todo item', complete: false },
	];
};