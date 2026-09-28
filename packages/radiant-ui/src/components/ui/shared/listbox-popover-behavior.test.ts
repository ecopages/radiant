import { describe, expect, it, vi } from 'vitest';
import { ListboxPopoverBehavior } from './listbox-popover-behavior';

function createOption(id: string, label: string, hidden = false): HTMLElement {
	const option = document.createElement('div');
	option.setAttribute('role', 'option');
	option.id = id;
	option.textContent = label;
	option.hidden = hidden;
	return option;
}

function createBehavior(options: HTMLElement[] = []) {
	const anchor = document.createElement('div');
	const floating = document.createElement('div');
	const activeHost = document.createElement('button');
	let open = false;

	const behavior = new ListboxPopoverBehavior({
		getAnchor: () => anchor,
		getFloating: () => floating,
		getOpen: () => open,
		getOptions: () => options,
		getActiveDescendantHost: () => activeHost,
		getOptionIdPrefix: () => 'rui-test-option',
	});

	return { anchor, floating, activeHost, behavior, setOpen: (next: boolean) => (open = next) };
}

describe('ListboxPopoverBehavior', () => {
	it('ensures option ids and tracks active-descendant navigation', () => {
		const options = [createOption('', 'One'), createOption('', 'Two')];
		const { behavior, activeHost, setOpen } = createBehavior(options);
		setOpen(true);

		behavior.ensureOptionIds();
		behavior.setActiveOption(1);

		expect(options[1].id).toBe('rui-test-option-1');
		expect(options[1].getAttribute('data-active')).toBe('true');
		expect(activeHost.getAttribute('aria-activedescendant')).toBe('rui-test-option-1');
		expect(behavior.activeOptionIndex).toBe(1);
		expect(behavior.hasVisualFocus).toBe(true);
	});

	it('opens on first arrow press when closed', () => {
		const options = [createOption('a', 'One'), createOption('b', 'Two')];
		const { behavior, setOpen } = createBehavior(options);
		const onOpen = vi.fn();

		behavior.moveActive(1, onOpen);

		expect(onOpen).toHaveBeenCalledWith('first');
		expect(setOpen).toBeDefined();
	});

	it('wraps active option movement when open', () => {
		const options = [createOption('a', 'One'), createOption('b', 'Two')];
		const { behavior, setOpen } = createBehavior(options);
		setOpen(true);

		behavior.setActiveOption(1);
		behavior.moveActive(1, vi.fn());

		expect(behavior.activeOptionIndex).toBe(0);
	});

	it('handles shared keyboard interactions through callbacks', () => {
		const options = [createOption('a', 'One')];
		const { behavior, setOpen } = createBehavior(options);
		setOpen(true);
		behavior.setActiveOption(0);

		const onSelectActive = vi.fn();
		const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
		const preventDefault = vi.spyOn(event, 'preventDefault');

		behavior.handleKeydown(event, {
			isOpen: true,
			canUseSpace: true,
			closesOnTab: false,
			enterWhenClosed: 'open',
			enterWithoutActive: 'ignore',
			onOpen: vi.fn(),
			onClose: vi.fn(),
			onSelectActive,
		});

		expect(preventDefault).toHaveBeenCalled();
		expect(onSelectActive).toHaveBeenCalled();
	});

	it('dismisses focus and pointer interactions outside the popover tree', () => {
		const { anchor, floating, behavior } = createBehavior();
		const inside = document.createElement('button');
		floating.append(inside);
		document.body.append(anchor, floating);

		expect(behavior.shouldDismissFocus(inside)).toBe(false);
		expect(behavior.shouldDismissPointer(inside)).toBe(false);
		expect(behavior.shouldDismissFocus(document.body)).toBe(true);
		expect(behavior.shouldDismissPointer(document.body)).toBe(true);

		anchor.remove();
		floating.remove();
	});
});
