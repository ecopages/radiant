import './radiant-event.script';

export const RadiantEvent = () => {
  return (
    <radiant-event-listener class="grid gap-3 max-w-fit">
      <div class="bg-gray-100 text-black p-3" data-ref="event-detail">
        Click to change the text
      </div>
      <radiant-event-emitter>
        <button class="bg-blue-700 text-white px-2 py-1 rounded-md" type="button" data-ref="emit-button">
          Emit Event
        </button>
      </radiant-event-emitter>
    </radiant-event-listener>
  );
};
