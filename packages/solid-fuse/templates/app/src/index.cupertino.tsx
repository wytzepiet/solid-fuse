import { createSignal } from "solid-js";
import { Button, CupertinoApp, NavigationBar, PageScaffold } from "@solid-fuse/cupertino";
import { Navigator, Text, View, render } from "solid-fuse";

function Home() {
  const [count, setCount] = createSignal(0);
  return (
    <PageScaffold navigationBar={<NavigationBar title="{{title}}" />}>
      <View width={Infinity} height={Infinity} layout={{ align: "center", justify: "center", gap: 16 }}>
        <Text fontSize={48}>{count()}</Text>
        <Button testId="add" onPress={() => setCount(count() + 1)}>
          Add one
        </Button>
      </View>
    </PageScaffold>
  );
}

render(() => (
  <CupertinoApp title="{{title}}">
    <Navigator initialPage={() => <Home />} />
  </CupertinoApp>
));
