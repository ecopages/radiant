import type { WithChildren } from '@/types';
import type { RadiantDropdownProps } from './dropdown.script';
import './dropdown.script';
import './dropdown.css';

export const RadiantDropdown = ({ defaultOpen, placement, arrow, children }: WithChildren<RadiantDropdownProps>) => {
  return (
    <radiant-dropdown defaultOpen={defaultOpen} placement={placement}>
      <button type="button" data-ref="trigger" class="rui-button rui-button--primary rui-button--md">
        Open
      </button>
      <div data-ref="content">
        {children as 'safe'}
        {arrow ? <div data-ref="arrow"></div> : null}
      </div>
    </radiant-dropdown>
  );
};
