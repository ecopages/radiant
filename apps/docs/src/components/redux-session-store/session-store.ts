/**
 * A Redux-shaped store that does not belong to any host.
 *
 * @remarks In an app this is `configureStore(...)` from Redux Toolkit. Radiant
 * hosts only read slices. Writes go through `dispatch`.
 */
export type SessionState = {
	theme: 'light' | 'dark';
	user: string;
};

export type SessionAction = { payload: string; type: 'session/rename' } | { type: 'session/toggleTheme' };

type Listener = () => void;

function reduceSession(state: SessionState, action: SessionAction): SessionState {
	if (action.type === 'session/rename') {
		return { ...state, user: action.payload };
	}

	if (action.type === 'session/toggleTheme') {
		return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' };
	}

	return state;
}

let current: SessionState = { theme: 'light', user: 'Ada' };
const listeners = new Set<Listener>();

export const sessionStore = {
	dispatch(action: SessionAction) {
		current = reduceSession(current, action);
		for (const listener of [...listeners]) listener();
	},
	getState: (): SessionState => current,
	subscribe(listener: Listener) {
		listeners.add(listener);
		return () => listeners.delete(listener);
	},
};

export function renameSessionUser(name: string): void {
	sessionStore.dispatch({ payload: name, type: 'session/rename' });
}

export function toggleSessionTheme(): void {
	sessionStore.dispatch({ type: 'session/toggleTheme' });
}
