// pull_to_refresh README:
//   RefreshController _refreshController = RefreshController(initialRefresh: false);
//   void _onRefresh() async { await Future.delayed(Duration(milliseconds: 1000)); _refreshController.refreshCompleted(); }
//   SmartRefresher(enablePullDown: true, enablePullUp: true, header: WaterDropHeader(), controller: _refreshController,
//     onRefresh: _onRefresh, onLoading: _onLoading, child: ListView.builder(...))
// video_player README:
//   _controller = VideoPlayerController.networkUrl(Uri.parse('https://.../bee.mp4'))..initialize().then((_) { setState(() {}); });
//   _controller.value.isInitialized ? AspectRatio(aspectRatio: _controller.value.aspectRatio, child: VideoPlayer(_controller)) : Container()
//   onPressed: () { _controller.value.isPlaying ? _controller.pause() : _controller.play(); }
import { For, Show } from "solid-js";
import { GestureDetector, ScrollView, Text, View } from "solid-fuse";
import { SmartRefresher, WaterDropHeader } from "~/_generated/pull_to_refresh";
import { createRefreshController } from "~/modules/pull_to_refresh";
import { VideoPlayer } from "~/_generated/video_player";
import { createVideoPlayerControllerNetworkUrl, type VideoPlayerController } from "~/modules/video_player";
import { PullToRefresh } from "../../wrappers/pull-to-refresh";
import { Video } from "../../wrappers/video";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const Rows = () => <ScrollView><For each={["1", "2", "3"]}>{(t) => <Text>{t}</Text>}</For></ScrollView>;

// BEFORE: line for line, the controller protocol is the app's job.
export function RawRefresh() {
  const controller = createRefreshController({ initialRefresh: false });
  const onRefresh = async () => { await sleep(1000); await controller.refreshCompleted(); };
  const onLoading = async () => { await sleep(1000); await controller.loadComplete(); };
  return (
    <SmartRefresher enablePullDown enablePullUp header={<WaterDropHeader />} controller={controller} onRefresh={onRefresh} onLoading={onLoading}>
      <Rows />
    </SmartRefresher>
  );
}
// AFTER
export const NiceRefresh = () => <PullToRefresh onRefresh={() => sleep(1000)} onLoadMore={() => sleep(1000)}><Rows /></PullToRefresh>;

// BEFORE
export function RawVideo() {
  const c = createVideoPlayerControllerNetworkUrl("https://flutter.github.io/assets-for-api-docs/assets/videos/bee.mp4");
  void c.initialize();
  const v = () => c.value();
  return (
    <GestureDetector onTap={() => (v()?.isPlaying ? c.pause() : c.play())}>
      <Show when={v()?.isInitialized}>
        <View aspectRatio={(v()?.size.width ?? 16) / (v()?.size.height || 9)}>
          <VideoPlayer controller={c} />
        </View>
      </Show>
    </GestureDetector>
  );
}
// AFTER
export function NiceVideo() {
  let c!: VideoPlayerController;
  return (
    <GestureDetector onTap={() => (c.value()?.isPlaying ? c.pause() : c.play())}>
      <Video src="https://flutter.github.io/assets-for-api-docs/assets/videos/bee.mp4" loop ref={(x) => (c = x)} />
    </GestureDetector>
  );
}
