/**
 * The pitch, written for someone who has heard of neither Solid nor Flutter,
 * in the order they ask: what is it, what are these two names, will I
 * recognise it, why this and not React Native, what can I do with it, can my
 * agent work with it, is it ready.
 */

export const what = {
  title: 'Native apps, written in TypeScript.',
  body: 'Write JSX and get a real iOS and Android app, with no webview in between. For you, or for the agent that writes your code.',
};

export const names = [
  {
    name: 'Solid',
    title: 'Solid runs your code.',
    body: 'Like React, without re-renders.',
  },
  {
    name: 'Flutter',
    title: 'Flutter draws the screen.',
    body: 'Google’s engine. Every pixel, on every platform.',
  },
];

export const why = {
  name: 'Why',
  title: 'Why not React Native?',
  /** What you compare, React Native, solid-fuse. */
  rows: [
    ['The screen', 'Each platform’s own controls', 'Its own pixels, the same everywhere'],
    ['Testing by an agent', 'Needs an emulator or a device', 'Runs as a Linux app, no screen needed'],
    ['Packages', 'npm', 'npm and every Flutter package'],
  ] as [string, string, string][],
  points: [
    ['It draws its own pixels.', 'One look to design and test, on every device.'],
    ['It runs on Linux.', 'So a cloud agent can open the app and check its own work.'],
    ['npm and Flutter packages.', 'Logic from one; charts, maps and video from the other.'],
  ] as [string, string][],
};

export type TourChapter = {
  name: string;
  title: string;
  note: string;
  code: [string, string][];
};

/** Will I recognise it: the first thing anyone writes. */
export const basics: TourChapter = {
  name: 'Basics',
  title: 'If you write React, you can read this.',
  note: 'State is a signal: a value you call to read. View, Text and Pressable are native elements.',
  code: [
    [
      `import { createSignal } from "solid-js";
import { Pressable, Text, View } from "solid-fuse";

export default function Counter() {
  const [count, setCount] = createSignal(0);

  return (
    <View layout={{ align: "center", gap: 20 }}>
      <Text fontSize={64}>{count()}</Text>
      <Pressable onPress={() => setCount((c) => c + 1)}>
        <Text>Tap me</Text>
      </Pressable>
    </View>
  );
}`,
      'tsx',
    ],
  ],
};

/** What can I do with it: one outcome per chapter. */
export const tour: TourChapter[] = [
  {
    name: 'Motion',
    title: 'Springy animation in two lines.',
    note: 'A spring is just another value you read. It is computed inside the frame that draws it, so it never lags a frame behind.',
    code: [
      [
        `const [pressed, setPressed] = createSignal(false);
const [scale] = createSpring(() => (pressed() ? 1.2 : 1), bouncy);

<Pressable onPressedChange={setPressed}>
  <View
    width={120}
    height={120}
    decoration={{ color: "#ff8a2a", borderRadius: 36 }}
    transform={{ scale: scale() }}
  />
</Pressable>`,
        'tsx',
      ],
    ],
  },
  {
    name: 'Loading',
    title: 'Loading states without the bookkeeping.',
    note: 'Fetch inside a computed value and wrap the list in Loading. There are no isLoading flags to pass around, and fetch itself is native.',
    code: [
      [
        `const trips = createMemo(() =>
  fetch("https://api.example.com/trips").then((r) => r.json()),
);

<Loading fallback={<Skeleton rows={4} />}>
  <For each={trips()}>
    {(trip) => <TripRow trip={trip} />}
  </For>
</Loading>`,
        'tsx',
      ],
    ],
  },
  {
    name: 'Packages',
    title: 'Use any Flutter package.',
    note: 'Add one line and solid-fuse writes typed JSX components for everything in the package. Nothing to wrap by hand.',
    code: [
      [`// dart/lib/fuse.dart\nexport 'package:fl_chart/fl_chart.dart';`, 'dart'],
      [
        `import { FlSpot, LineChart, LineChartBarData, LineChartData }
  from "#fuse/fl_chart";

<LineChart
  data={LineChartData({
    lineBarsData: [
      LineChartBarData({
        spots: week().map((km, day) => FlSpot(day, km)),
        isCurved: true,
      }),
    ],
  })}
/>`,
        'tsx',
      ],
    ],
  },
  {
    name: 'Platforms',
    title: 'Right on iPhone and on Android.',
    note: 'Controls take each platform’s look. One value switches it, even while the app is running, so you can check both on one device.',
    code: [
      [
        `const [platform, setPlatform] = createSignal<TargetPlatform>();

<AdaptiveApp theme={{ seedColor: "#ff8a2a" }} platform={platform()}>
  <Navigator />
</AdaptiveApp>

// in Settings
<Switch value={on()} onChange={setOn} />
<Button onPress={save}>Save</Button>`,
        'tsx',
      ],
    ],
  },
];

export const agent = {
  title: 'Your agent can test its own work.',
  body: 'Because the app also runs on Linux, a coding agent on a cloud machine can start it with no screen, tap through it and take screenshots. The tool for that is built into every app.',
};

export const ready = {
  title: 'It’s an early preview.',
  body: 'You need Bun or Node and the Flutter SDK. There is no one-line installer yet: setup is a short guide, and a whole app is two files, a TSX component and one short Dart file.',
};
