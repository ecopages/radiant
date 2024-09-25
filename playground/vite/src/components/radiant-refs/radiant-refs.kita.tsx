import './radiant-refs';

export function RadiantRefs() {
  return (
    <radiant-refs class="grid gap-3">
      <div class="bg-secondary-container p-3 justify-between flex items-center rounded-md">
        <button class="rui-button rui-button--primary rui-button--md" type="button" data-ref="create">
          Add Ref
        </button>
        <div class="bg-surface text-black p-2 rounded-md" data-ref="count">
          Ref Count: 1
        </div>
        <button class="rui-button rui-button--primary rui-button--md" type="button" data-ref="reset">
          Reset Refs
        </button>
      </div>
      <div class="bg-surface text-on-surface grid gap-2 p-2" data-ref="container">
        <div class="bg-background cursor-pointer p-2" data-ref="item">
          Ref Item
        </div>
      </div>
    </radiant-refs>
  );
}
