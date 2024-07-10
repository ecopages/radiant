import './radiant-event.script';

export const RadiantEvent = () => {
  return (
    <radiant-event-listener class="grid gap-3 max-w-fit">
      <p class="text-sm">Latest Event</p>
      <div class="bg-gray-100 text-black p-3 min-w-80" data-ref="event-detail">
        No Event
      </div>
      <radiant-event-emitter>
        <button class="bg-blue-700 text-white px-2 py-1 rounded-md" type="button" data-ref="emit-button">
          Emit Event
        </button>
      </radiant-event-emitter>
    </radiant-event-listener>
  );
};
