/** Copy shared by the home page ideas under /ideas. */

export const github = 'https://github.com/wytzepiet/solid-fuse';

export const counterCode = `function Counter() {
  const [count, setCount] = createSignal(0);

  return (
    <View layout={{ align: "center", gap: 20 }}>
      <Text fontSize={64}>{count()}</Text>
      <Pressable onPress={() => setCount((c) => c + 1)}>
        <Text>Tap me</Text>
      </Pressable>
    </View>
  );
}`;

export const appCode = `import { createSignal } from "solid-js";
import { Pressable, Text, View } from "solid-fuse";

export default function App() {
  const [count, setCount] = createSignal(0);

  return (
    <View layout={{ align: "center", justify: "center", expand: true }}>
      <Text fontSize={48} fontWeight={700}>
        {count()}
      </Text>
      <Pressable onPress={() => setCount((c) => c + 1)}>
        <Text>Tap me</Text>
      </Pressable>
    </View>
  );
}`;

export const dartCode = `import 'package:flutter/widgets.dart';
import 'package:solid_fuse/solid_fuse.dart';
import '_generated/fuse_packages.dart';

void main() async {
  FuseBinding.ensureInitialized();

  final runtime = await FuseRuntime.create();
  registerFusePackages(runtime);
  await runtime.start();

  runApp(FuseView(runtime: runtime));
}`;

export const solidCode = `const [todos, setTodos] = createSignal(["Learn Fuse"]);

<View layout={{ gap: 8 }} padding={16}>
  <For each={todos()}>
    {(todo) => <Text fontSize={16}>{todo}</Text>}
  </For>
  <Show when={todos().length === 0}>
    <Text color="#16A34A">All done</Text>
  </Show>
</View>`;

export const springCode = `const [pressed, setPressed] = createSignal(false);
const [scale] = createSpring(() => (pressed() ? 1.2 : 1));

<Pressable onPressedChange={setPressed}>
  <View transform={{ scale: scale() }} />
</Pressable>`;

export const genCode = `// dart/lib/fuse.dart
export 'package:fl_chart/fl_chart.dart';

// App.tsx
import { LineChart } from "#fuse/fl_chart";`;

export const templateCode = `<View padding={8}>
  <Text fontSize={12}>Total</Text>
  <Text color="#EF4444">{total()}</Text>
</View>`;

export const premise =
  'Mobile apps in Solid 2.0, drawn by Flutter. Easy for you or your agent to write, fast without tuning.';

/** What an agent types to run and check an app on a machine with no screen. */
export const agentSession: { cmd: string; out?: string }[] = [
  { cmd: 'fuse dev --headless', out: 'Ready for fuse drive' },
  { cmd: 'fuse drive tap --text "Send code"' },
  { cmd: 'fuse drive enter-text --identifier phone --input "0612345678"' },
  { cmd: 'fuse drive take-screenshots -o screen.png' },
  { cmd: 'fuse drive get-logs' },
];

export type Pillar = {
  key: 'agents' | 'ecosystems' | 'both' | 'lean';
  name: string;
  body: string[];
  href: string;
  link: string;
};

export const pillars: Pillar[] = [
  {
    key: 'agents',
    name: 'Written by you, or by your agent',
    body: [
      'You write TSX, and fuse dev hot reloads it on the device. Every app can also be driven from the command line: tap, type, scroll, take a screenshot, read the logs.',
      'Flutter runs on Linux as well as on phones, so a cloud agent with no screen can run your mobile app, use it, and look at what it built.',
    ],
    href: '/docs/agents',
    link: 'Developing with agents',
  },
  {
    key: 'ecosystems',
    name: 'npm and pub.dev, both',
    body: [
      'JavaScript packages run in a runtime with fetch, crypto, timers and streams built in. Flutter packages are one export away.',
      'fuse gen reads the Dart signatures and writes a typed component for every widget in the package. Under fuse dev that takes about a tenth of a second, and you import the result like any other module.',
    ],
    href: '/docs/flutter/widgets',
    link: 'Generated components',
  },
  {
    key: 'both',
    name: 'Solid decides what changes. Flutter draws it.',
    body: [
      'Solid 2.0 gives you signals, async and fine-grained updates with no virtual DOM. Flutter gives you layout, gestures, navigation and a renderer that owns every pixel, the same on every platform.',
      'Neither is watered down to fit the other. A spring is a signal; it ticks inside Flutter’s frame and is drawn in that same frame.',
    ],
    href: '/docs/build/animation',
    link: 'Animation',
  },
  {
    key: 'lean',
    name: 'Only what you use',
    body: [
      'A signal change rebuilds the one widget that reads it. The constant part of your JSX is compiled into a template and sent to Flutter once.',
      'A release build keeps only the Dart your bundle actually renders, and the app caches the bundle as QuickJS bytecode.',
    ],
    href: '/docs/internals/architecture',
    link: 'Architecture',
  },
];
