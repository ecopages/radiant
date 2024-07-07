import './radiant-refs';

export function RadiantRefs() {
  return (
    <radiant-refs class="grid gap-3">
      <button class="bg-blue-700 text-white px-2 py-1 rounded-md" type="button" data-ref="create-ref">
        Add Ref
      </button>
      <div class="bg-gray-100 text-black p-3" data-ref="ref-count">
        Ref Count: 1
      </div>
      <div class="bg-gray-100 text-black p-3" data-ref="ref-container">
        <div class="bg-gray-100 text-black p-3" data-ref="ref-item">
          Ref Item
        </div>
      </div>
    </radiant-refs>
  );
}
