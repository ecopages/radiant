import '@ecopages/radiant-ui/themes/default';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/video-player.css';
import { VideoPlayerApp } from '../src/content/components/recipes/video-player.component';
import { describeVideoPlayerComponent } from './video-player-component';

describeVideoPlayerComponent('component', 'video-player', VideoPlayerApp, {
	play: 1,
	playFrames: 0,
	seek: 0,
	mute: 1,
	rate: 1,
});
