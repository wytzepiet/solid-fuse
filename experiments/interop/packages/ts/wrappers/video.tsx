// Thin TS wrapper over video_player: VideoPlayer (widget generator) + VideoPlayerController (object generator).
// Composition: 1 extra node (a View carrying the aspect ratio) around the native VideoPlayer, plus the
// controller handle. Per render: aspect ratio derived from the mirrored `value` signal (recomputed only when
// the controller pushes a new value).
import { Show } from "solid-js";
import { View } from "solid-fuse";
import { VideoPlayer } from "~/_generated/video_player";
import { createVideoPlayerControllerAsset, createVideoPlayerControllerNetworkUrl, type VideoPlayerController } from "~/modules/video_player";

export interface VideoProps {
  src: string;
  autoPlay?: boolean;
  loop?: boolean;
  ref?: (controller: VideoPlayerController) => void;
}

export function Video(props: VideoProps) {
  const c = /^https?:/.test(props.src) ? createVideoPlayerControllerNetworkUrl(props.src) : createVideoPlayerControllerAsset(props.src);
  props.ref?.(c);
  void c.initialize().then(async () => {
    if (props.loop) await c.setLooping(true);
    if (props.autoPlay) await c.play();
  });
  const ratio = () => {
    const s = c.value()?.size;
    return s && s.height > 0 ? s.width / s.height : 16 / 9;
  };
  return (
    <Show when={c.value()?.isInitialized}>
      <View aspectRatio={ratio()}>
        <VideoPlayer controller={c} />
      </View>
    </Show>
  );
}
