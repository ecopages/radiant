import type { RadiantDropdownProps } from './dropdown.script';
import './dropdown.script';
import './dropdown.css';

export const RadiantDropdown = ({ defaultOpen, placement, arrow }: RadiantDropdownProps) => {
  return (
    <radiant-dropdown defaultOpen={defaultOpen} placement={placement}>
      <button type="button" data-ref="trigger" class="rui-button rui-button--primary rui-button--md">
        Open
      </button>
      <div data-ref="content">
        <ul class="flex flex-col gap-2">
          <li>Option 1</li>
          <li>Option 2</li>
          <li>Option 3</li>
        </ul>
        {arrow ? <div data-ref="arrow"></div> : null}
      </div>
    </radiant-dropdown>
  );
};