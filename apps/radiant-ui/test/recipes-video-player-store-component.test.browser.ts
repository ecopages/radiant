import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/video-player.css';
import { VideoPlayerStoreApp } from '../src/content/components/recipes/video-player-store.component';
import { describeVideoPlayerComponent } from './video-player-component';

describeVideoPlayerComponent('store component', 'video-player-store', VideoPlayerStoreApp, {
	play: 0,
	playFrames: 0,
	seek: 0,
	mute: 0,
	rate: 0,
});
