import './radiant-event.script';

export const RadiantEvent = () => {
	return (
		<>
			<radiant-event-listener class="grid gap-3 max-w-fit">
				<p class="text-sm">Latest Event</p>
				<div class="bg-gray-100 text-black p-3 min-w-80" data-ref="event-detail">
					No Event
				</div>
				<radiant-event-emitter>
					<button class="rui-button rui-button--md rui-button--primary" type="button" data-ref="emit-button">
						Emit Event
					</button>
				</radiant-event-emitter>
			</radiant-event-listener>
			<radiant-keyboard-keys class="flex items-center gap-4 bg-indigo-200 rounded-md max-w-fit p-2">
				<p class="text-sm">Last Key Pressed</p>
				<span class="text-gray-900 font-bold p-2 bg-gray-100 min-w-20 h-10 flex items-center justify-center rounded-md"></span>
			</radiant-keyboard-keys>
			<radiant-sizer class="grid gap-3 w-full">
				<p class="text-sm">Window Size</p>
				<div class="bg-gray-100 text-black p-3 w-full text-center" data-ref="window">
					0 x 0
				</div>
				<p class="text-sm">Element Size</p>
				<div class="bg-gray-100 text-black p-3 w-full text-center" data-ref="element">
					0 x 0
				</div>
			</radiant-sizer>
		</>
	);
};
